const mongoose = require('mongoose');

const mealCalorieEstimateSchema = new mongoose.Schema(
  {
    userInputText: {
      type: String,
      default: '',
      trim: true,
      maxlength: 600,
    },
    imageUrl: {
      type: String,
      default: '',
      trim: true,
    },
    estimatedCalories: {
      type: Number,
      required: true,
      min: 0,
    },
    confidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    source: {
      type: String,
      default: 'openai',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('MealCalorieEstimate', mealCalorieEstimateSchema);
