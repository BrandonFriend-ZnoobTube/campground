const express = require('express');
const TryAsync = require('../utils/TryAsync');
const Campground = require('../models/campground');
const Review = require('../models/review');
const { validateReview, isLoggedIn, validateReviewAuthor } = require('../middleware');
const router = express.Router({ mergeParams: true });

router.post('/', isLoggedIn, validateReview, TryAsync(async (req, res) => {
  const camp = await Campground.findById(req.params.id);
  const review = new Review(req.body.review);
  review.author = req.user._id;
  camp.reviews.push(review);
  await review.save();
  await camp.save();
  req.flash('success', 'Successfully created a new review');
  res.redirect(`/camp/show/${ camp._id }`);
}));

router.delete('/:reviewId', isLoggedIn, validateReviewAuthor, TryAsync(async (req, res) => {
  const { id, reviewId } = req.params;
  await Campground.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  req.flash('success', 'Successfully deleted review');
  res.redirect(`/camp/show/${ id }`);
}));

module.exports = router;