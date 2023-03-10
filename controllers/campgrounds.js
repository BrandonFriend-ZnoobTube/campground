const Campground = require('../models/campground');
const mapboxGeocoding = require('@mapbox/mapbox-sdk/services/geocoding');
const { cloudinary } = require('../cloudinary');
const mapboxToken = process.env.MAPBOX_TOKEN;
const geocoding = mapboxGeocoding({ accessToken: mapboxToken });

module.exports.index = async (req, res) => {
  const camps = await Campground.find({});
  res.render('camp/list', { camps });
};

module.exports.getNew = (req, res) => {
  res.render('camp/new');
};

module.exports.getCamp = async (req, res) => {
  const camp = await Campground.findById(req.params.id)
    .populate({
      path: 'reviews',
      populate: {
        path: 'author'
      }
    })
    .populate('author');
  if (!camp) {
    req.flash('error', 'Campground has moved or been deleted');
    return res.redirect('/camp');
  }
  res.render('camp/show', { camp });
};

module.exports.getCampEdit = async (req, res) => {
  const camp = await Campground.findById(req.params.id);
  res.render('camp/edit', { camp });
};

module.exports.postCampCreate = async (req, res) => {
  const geoData = await geocoding.forwardGeocode({
    query: req.body.campground.location,
    limit: 1
  }).send();
  const camp = new Campground(req.body.campground);
  camp.geometry = geoData.body.features[0].geometry;
  camp.image = req.files.map(f => ({ url: f.path, filename: f.filename }));
  camp.author = req.user._id;
  await camp.save();
  req.flash('success', 'Successfully made a new campground');
  res.redirect(`/camp/${ camp._id }`);
};

module.exports.putCampEdit = async (req, res) => {
  const { id } = req.params;
  const camp = await Campground.findByIdAndUpdate(id, { ...req.body.campground });
  const images = req.files.map(f => ({ url: f.path, filename: f.filename }));
  camp.image.push(...images);
  await camp.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
      await cloudinary.uploader.destroy(filename);
    }
    await camp.updateOne({ $pull: { image: { filename: { $in: req.body.deleteImages } } } });
  }
  req.flash('success', 'Successfully updated campground');
  res.redirect(`/camp/${ camp._id }`);
};

module.exports.deleteCamp = async (req, res) => {
  const { id } = req.params;
  await Campground.findByIdAndDelete(id);
  req.flash('success', 'Successfully deleted campground');
  res.redirect('/camp/list');
};