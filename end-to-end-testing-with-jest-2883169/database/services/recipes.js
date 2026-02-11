/* eslint-disable linebreak-style */
/* eslint-disable consistent-return */
/* eslint-disable no-empty */
/* eslint-disable space-before-blocks */
/* eslint-disable keyword-spacing */
/* eslint-disable linebreak-style */
const Recipes = require('../models/recipes');

const RecipesClass = {
  //  ------save data------
  saveRecipes: async (recipesDetail) => {
    const response = await Recipes.create(recipesDetail);
    return response;
  },

  allRecipes: async () => {
    const response = await Recipes.find();
    return response;
  },

  fetchById: async (id) => {
    // eslint-disable-next-line keyword-spacing
    try{
      const response = await Recipes.findById(id);
      return response;
    }catch(err){
    }
  },

  fetchByIdAndUpdate: async (id, recipesDetail) => {
    const response = await Recipes.findByIdAndUpdate(id, { $set: recipesDetail }, { new: true });
    return response;
  },

  fetchByIdAndDelete: async (id) => {
    const response = await Recipes.findByIdAndDelete(id);
    return response;
  },
};

module.exports = RecipesClass;
