/* eslint-disable linebreak-style */
/* eslint-disable no-undef */
/* eslint-disable no-underscore-dangle */
const request = require('supertest');
const bcrypt = require('bcrypt');
const app = require('../index.js');
const User = require('../database/models/users');
const mongoose = require('../database/dbConection');
const UserService = require('../database/services/users.js');
const RecipeService = require('../database/services/recipes.js');

let id;
let token;
describe('test the recipes API', () => {
  beforeAll(async () => {
    // create a test user
    const password = bcrypt.hashSync('testAdmin', 10);
    await User.create({
      username: 'testAdmin',
      password,
    });
  });

  afterAll(async () => {
    await User.deleteMany();
    mongoose.disconnect();
  });

  // test user login
  describe('POST /login', () => {
    it('authenticate user and sign in', async () => {
      // Data to save
      const user = {
        username: 'testAdmin',
        password: 'testAdmin',
      };
      const res = await request(app)
        .post('/login')
        .send(user);
      token = res.body.accessToken;
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(expect.objectContaining({
        accessToken: res.body.accessToken,
        success: true,
        data: expect.objectContaining(
          {
            id: res.body.data.id,
            username: res.body.data.username,
          },
        ),
      }));
    });

    it('do not sign if password is empty', async () => {
      const user = {
        username: 'testAdmin',
      };
      const res = await request(app).post('/login').send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining(
          {
            success: false,
          },
        ),
      );
    });

    it('do not sign if username is empty', async () => {
      const user = {
        password: 'testAdmin',
      };
      const res = await request(app).post('/login').send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining(
          {
            success: false,
          },
        ),
      );
    });

    it('do not sign in if user does not exist', async () => {
      const user = {
        username: 'chai',
        password: 'testAdmin',
      };
      const res = await request(app).post('/login').send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(expect.objectContaining({
        success: false,
      }));
    });

    it('do not sign in if password is incorrect', async () => {
      const user = {
        username: 'testAdmin',
        password: 'wrongPassword',
      };

      const res = await request(app).post('/login').send(user);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(expect.objectContaining({
        success: false,
      }));
    });

    it('do not sign in , internal server error', async () => {
      const user = {
        username: 'testAdmin',
        password: 'testAdmin',
      };

      jest.spyOn(UserService, 'findByUsername')
        .mockRejectedValueOnce(new Error());

      const res = await request(app).post('/login').send(user);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(expect.objectContaining({
        success: false,
        message: 'login failed.',
      }));
    });
  });

  // test create recipes
  describe('POST /recipes', () => {
    it('it should add new recipes to DB', async () => {
      const recipes = {
        name: 'chicken nuggets',
        difficulty: 2,
        vegetarian: false,
      };
      const res = await request(app).post('/recipes').send(recipes).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(201);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
      id = res.body.data._id;
    });

    it('it should not save new recipe to db, invalid vegetarian value', async () => {
      const recipe = {
        name: 'Chicken nuggets',
        difficulty: 4,
        vegetarian: 'true',
      };
      const res = await request(app).post('/recipes').send(recipe).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('It should not save new user to db, empty name', async () => {
      const recipe = {
        difficulty: 3,
        vegetarian: true,
      };
      const res = await request(app).post('/recipes').send(recipe).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('It should not save new user to db, invalid difficulty value', async () => {
      const recipe = {
        name: 'Fried rice',
        difficulty: '3',
        vegetarian: true,
      };
      const res = await request(app).post('/recipes').send(recipe).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('It should not save new user to db, invalid token value', async () => {
      const recipe = {
        name: 'Fried rice',
        difficulty: 3,
        vegetarian: true,
      };
      const res = await request(app).post('/recipes').send(recipe).set('Authorization', 'Bearer hgkkggkjggggjgkjgggkgkgg');
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });

    it('It should not save new recipe to database, internal server error', async () => {
      const recipe = {
        name: 'Fried rice',
        difficulty: 3,
        vegetarian: true,
      };
      jest.spyOn(RecipeService, 'saveRecipes').mockRejectedValueOnce(new Error());

      const res = await request(app)
        .post('/recipes')
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Failed to save recipes!',
        }),
      );
    });
  });

  // test get all recipe
  describe('GET /recipes', () => {
    it('it should retrieve all the recipe in the database', async () => {
      const res = await request(app)
        .get('/recipes');
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
    it('it should not retrieve any recipe from db,internal server error', async () => {
      jest.spyOn(RecipeService, 'allRecipes')
        .mockRejectedValueOnce(new Error());
      const res = await request(app)
        .get('/recipes')
        .send();
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Some error occurred while retrieving recipes.',
        }),
      );
    });
    it('it should not retrieve any recipe from the db, internal server error', async () => {
      jest.spyOn(RecipeService, 'fetchById')
        .mockRejectedValueOnce(new Error());

      const res = await request(app)
        .get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Some error occurred while retrieving recipe details.',
        }),
      );
    });
  });

  // test get a particular recipe
  describe('GET /recipes/:id', () => {
    it('Retrieve a specified recipe in db', async () => {
      const res = await request(app)
        .get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });
    it('it should not retrieve any recipe from the db, invalid id passed', async () => {
      const res = await request(app)
        .get('/recipes/idhohdifhididsfiddhfiidhsishss');
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
    });
    it('It should not retrieve any recipe from db, internal server error', async () => {
      jest.spyOn(RecipeService, 'fetchById')
        .mockRejectedValueOnce(new Error());
      const res = await request(app).get(`/recipes/${id}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Some error occurred while retrieving recipe details.',
        }),
      );
    });
  });

  describe('PATCH /recipes/:id', () => {
    it('update the recipe record in db', async () => {
      const recipes = {
        name: 'chicken nuggets',
      };
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipes)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          data: expect.any(Object),
        }),
      );
    });

    it('it should not update recipe in db, invalid difficulty value', async () => {
      const recipe = {
        name: 'joll of rice',
        difficulty: '2',
      };
      const res = await request(app).patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('it should not update recipe in db, invalid vegetarian value', async () => {
      const recipe = {
        vegetarian: 'true',
        difficulty: 3,
      };
      const res = await request(app).patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
        }),
      );
    });

    it('it should not update recipe in db, invalid id passed', async () => {
      const recipe = {
        difficulty: 3,
      };
      const res = await request(app).patch('/recipes/slkdfkldskfndkln').send(recipe).set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'Recipe with id slkdfkldskfndkln does not exist',
        }),
      );
    });

    it('it should not update recipe in db, invalid token', async () => {
      const recipe = {
        name: 'Chicken nuggets',
      };
      const res = await request(app).patch(`/recipes/${id}`).send(recipe).set('Authorization', 'Bearer kjdkldskbfkfsbkdb');
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });

    it('it should not update recipe in db, no update passed', async () => {
      const recipe = {};
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(400);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'field should not be empty',
        }),
      );
    });

    it('it should not update recipe in db, internal server error', async () => {
      const recipe = {
        name: 'Chicken nuggets',
      };
      jest.spyOn(RecipeService, 'fetchByIdAndUpdate').mockRejectedValueOnce(new Error());
      const res = await request(app)
        .patch(`/recipes/${id}`)
        .send(recipe)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'An error occured while updating recipe',
        }),
      );
    });
  });

  // test delete recipe
  describe('DELETE /recipe/:id', () => {
    it('Delete the specified recipe', async () => {
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: true,
          message: 'Recipe successfully deleted',
        }),
      );
    });

    it('Fail to delete the specified recipe, invalid token', async () => {
      const res = await request(app).delete(`/recipes/${id}`).set('Authorization', 'Bearer kldflbisbibsdf');
      expect(res.statusCode).toEqual(403);
      expect(res.body).toEqual(
        expect.objectContaining({
          message: 'Unauthorized',
        }),
      );
    });

    it('it should not delete recipe in db, internal server error', async () => {
      jest.spyOn(RecipeService, 'fetchByIdAndDelete').mockRejectedValueOnce(new Error());
      const res = await request(app)
        .delete(`/recipes/${id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toEqual(500);
      expect(res.body).toEqual(
        expect.objectContaining({
          success: false,
          message: 'An error occured while deleting recipe',
        }),
      );
    });
  });
});
