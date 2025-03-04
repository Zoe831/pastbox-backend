const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Pastbox API' });
});

// In-memory storage
let stories = [];

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Create story
app.post('/api/stories', async (req, res) => {
  try {
    console.log('Received story creation request:', req.body);
    
    const { content, email, reminderDate, visibility } = req.body;

    if (!content || !email || !reminderDate) {
      console.error('Missing required fields:', { content, email, reminderDate });
      return res.status(400).json({
        message: 'Missing required fields'
      });
    }

    const newStory = {
      id: Date.now().toString(),
      content,
      email,
      reminderDate: new Date(reminderDate),
      visibility: visibility || 'private',
      createdAt: new Date(),
      status: 'pending'
    };

    console.log('Created new story:', newStory);
    stories.push(newStory);
    res.status(201).json(newStory);
  } catch (error) {
    console.error('Error creating story:', error);
    res.status(500).json({
      message: 'Failed to create story',
      error: error.message
    });
  }
});

// Get public stories
app.get('/api/stories/public', (req, res) => {
  try {
    const publicStories = stories.filter(story => story.visibility === 'public');
    res.json(publicStories);
  } catch (error) {
    console.error('Error fetching public stories:', error);
    res.status(500).json({
      message: 'Failed to fetch public stories',
      error: error.message
    });
  }
});

// Get story by ID
app.get('/api/stories/:id', (req, res) => {
  try {
    const story = stories.find(s => s.id === req.params.id);
    if (!story) {
      return res.status(404).json({
        message: 'Story not found'
      });
    }
    res.json(story);
  } catch (error) {
    console.error('Error fetching story:', error);
    res.status(500).json({
      message: 'Failed to fetch story',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

module.exports = app;

// Only listen if not running on Vercel
if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
} 