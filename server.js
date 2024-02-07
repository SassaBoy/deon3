const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();
const bodyParser = require('body-parser');
const multer = require('multer');
const validator = require('validator');

const app = express();
const port = 3001;
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Set up mongoose connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
 
});


// Check for successful connection
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});
const Subscription = mongoose.model('Subscription', {
  email: { type: String, required: true, unique: true }
});
const galleryItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String, required: true },
  link: { type: String, required: true },
  badgeName: String, // New field for Badges and Certifications category
});

const GalleryItem = mongoose.model('GalleryItem', galleryItemSchema);
const articleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  author: { type: String, required: true },
  category: { type: String, required: true },
  date: { type: String, required: true },
  comments: { type: Number, default: 0 },
  // Add a new field for the article text
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const Article = mongoose.model('Article', articleSchema);

// Set EJS as the view engine
app.set('view engine', 'ejs');

// Set the views directory
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: 31536000000 * 10000 }));
// Serve static assets from the public folder


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});
const upload = multer({ storage: storage });
// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
  tls: {
    rejectUnauthorized: false,
  },
});
// Define routes
// ... (your existing code)

// Add a new route to handle loading more articles
// Update the route for loading more articles




// ... (your existing code)

// Homepage route

// Homepage route
app.get('/', async (req, res) => {
  try {
    // Retrieve articles from the database and sort by date in descending order
    const articles = await Article.find().sort({ date: -1 });

    // Retrieve gallery items from the database
    // Retrieve gallery items from the database sorted by creation date
const galleryItems = await GalleryItem.find().sort({ createdAt: -1 });


    // Render the homepage with both articles and gallery items
    res.render('index', { articles, galleryItems });
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Paginated route
// Assuming you have a mongoose model for Article and a route for paginated articles
// ...

// Paginated route
// Paginated route
app.get('/articles/:page', async (req, res) => {
  try {
    const page = parseInt(req.params.page) || 1; // Get the requested page, default to 1
    const pageSize = 4; // Number of articles per page

    // Calculate the skip value based on the requested page
    const skip = (page - 1) * pageSize;

    // Fetch total number of articles
    const totalArticles = await Article.countDocuments();

    // Fetch articles from the database and sort by _id in descending order
    const articles = await Article.find().sort({ _id: -1 }).skip(skip).limit(pageSize);

    // Render the articles as JSON along with pagination information
    res.json({
      articles,
      totalPages: Math.ceil(totalArticles / pageSize),
      currentPage: page
    });
  } catch (error) {
    console.error('Error fetching paginated articles:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/article/:id', async (req, res) => {
  try {
    const articleId = req.params.id;

    // Validate that the provided ID is a valid ObjectId
    if (!mongoose.Types.ObjectId.isValid(articleId)) {
      return res.status(404).render('error', { error: 'Invalid article ID' });
    }

    // Fetch the article with the given ID from the database
    const article = await Article.findById(articleId);

    // Check if the article exists
    if (!article) {
      return res.status(404).render('error', { error: 'Article not found' });
    }

    // Render the article template with the fetched article data
    res.render('article', { article });
  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).render('error', { error: 'Internal Server Error. Failed to fetch article.' });
  }
});


// Thank You route (GET request)
// Thank You route (GET request)
app.get('/thank', async (req, res) => {
  try {
    // Retrieve the latest articles from the database
    const articles = await Article.find().sort({ date: -1 }); // Assuming you want to show the latest 3 articles

    // Organize articles by category
    const categorizedArticles = categorizeArticles(articles);

    // Render the thank-you.ejs view with the articles data
    res.render('thank', { categorizedArticles }); // Make sure to pass categorizedArticles here
  } catch (error) {
    console.error('Error fetching articles:', error);
    res.status(500).send('Internal Server Error');
  }
});
// Function to categorize articles by category
function categorizeArticles(articles) {
  const categorizedArticles = {};

  // Iterate through each article
  articles.forEach(article => {
    // Check if the category already exists in the categorizedArticles object
    if (categorizedArticles[article.category]) {
      // If the category exists, push the current article to the array
      categorizedArticles[article.category].push(article);
    } else {
      // If the category doesn't exist, create a new array with the current article
      categorizedArticles[article.category] = [article];
    }
  });

  return categorizedArticles;
}

// Route to send confirmation email for a new article
app.post('/send-confirmation-email/:articleId', async (req, res) => {
  try {
    const { email } = req.body;
    const { articleId } = req.params;

    // Call the sendConfirmationEmail function with the articleId
    await sendConfirmationEmail(email, articleId, req);

    // Send success response
    res.status(200).json({ success: true, message: 'Confirmation email sent successfully.' });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({ success: false, message: 'Error sending confirmation email.' });
  }
});
app.get('/article', (req, res) => {
  res.render('article'); // Render the thank-you.ejs view
});
app.post('/upload-article', upload.single('image'), async (req, res) => {
  const { title, description, category, content } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';
 

  try {
    const currentDate = new Date();

    const newArticle = new Article({
      title,
      description,
      image: imagePath,
      author: 'Deon Gewers',
      category,
      date: currentDate,
      comments: 5,
      content, // Adding the article text
    });

    await newArticle.save();

// Notify subscribers via email
const subscribers = await Subscription.find();
const newSubscriberEmail = req.body.email;
// const articleLink = `http:3001//localhost/article/${newArticle._id}`;
const articleLink = `https://${req.get('host')}/article/${newArticle._id}`;
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: newSubscriberEmail,
  subject: `${title}`,
  html: `
  <p>Hello Friend! 👋,</p>
  <p>
    In this edition, I'm thrilled to share a brand new article that I believe you'll find both insightful and engaging.
  </p>
  
  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0;">
  
    <h2 style="color: #007bff; margin: 0;">${title}</h2>
  
    <p style="font-size: 1.2em; color: #333; margin-top: 10px;">
      Welcome to Africa Wake Up – your gateway to a world of tech wonders! 🚀 I'm excited to unveil a cutting-edge article nestled in the vibrant realms of
      <span style="color: #dc3545;">${category}</span>. Get ready for an exhilarating journey that promises both insight and excitement!
    </p>
    
    <p style="font-size: 1.2em; color: #333; margin-top: 0;">${description}</p>
    
    <p style="font-size: 1.2em; color: #333; margin-top: 10px;">
      ${
        category === 'Coding Tips'
          ? `
          Elevate your coding skills with expert tips and techniques from seasoned developers. In this category, expect:
          <ul>
            <li>Insider coding strategies to optimize your development workflow.</li>
            <li>Best practices for writing clean and efficient code.</li>
            <li>Problem-solving techniques to tackle common coding challenges.</li>
          </ul>
          `
          : category === 'Latest Tech Trends'
          ? `
          Stay at the forefront of the tech world with insights into the latest trends and innovations. Explore:
          <ul>
            <li>Emerging technologies shaping the future of software development.</li>
            <li>Analysis of industry trends and their impact on the tech landscape.</li>
            <li>Spotlights on cutting-edge tools and frameworks.</li>
          </ul>
          `
          : category === 'Featured Coding Projects'
          ? `
          Embark on a journey of inspiration with standout coding projects showcasing creativity and technical prowess. Dive into:
          <ul>
            <li>Showcases of real-world projects demonstrating unique solutions.</li>
            <li>Behind-the-scenes insights into project development and decision-making.</li>
            <li>Opportunities to learn from diverse coding styles and project architectures.</li>
          </ul>
          `
          : 'Discover something valuable in these pages.'
      }
    </p>
  
    <p style="font-size: 1.2em; color: #333; margin-top: 10px;">
      Read the full article and join the conversation <strong>by visiting <a href="${articleLink}" style="color: #007bff; text-decoration: none;">my website</a></strong>.
    </p>
  
  </div>
  
  <p>If you have any thoughts, questions, or feedback, feel free to reply to this email. I always appreciate hearing from you!</p>
  
  <p>Happy reading!</p>
  <p>Best regards,</p>
  <p>Deon Gewers</p>
  `,
};


    

    subscribers.forEach(subscriber => {
      mailOptions.to = subscriber.email;
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.error('Error sending email:', error);
        } else {
          console.log('Email sent:', info.response);
        }
      });
    });

    res.redirect('/');
  } catch (error) {
    console.error('Error saving article:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Add this route to render the upload page
app.get('/upload', (req, res) => {
  res.render('upload');
});

// Add this route to render the upload page
app.get('/upload', (req, res) => {
  res.render('upload');
});
app.get('/addgallery', async (req, res) => {
  try {
    // Retrieve gallery items from the database
    const galleryItems = await GalleryItem.find(); // Adjust this query based on your data model

    // Render the addgallery.ejs template with the galleryItems
    res.render('addgallery', { galleryItems });
  } catch (error) {
    console.error('Error fetching gallery items:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Route to handle form submissions
app.post('/addgallery', upload.single('image'), async (req, res) => {
  const { title, category, link, badgeName } = req.body;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : '';

  try {
    const newGalleryItem = new GalleryItem({
      title,
      category,
      image: imagePath,
      link,
      badgeName,
      createdAt: new Date(), // Set the creation date
    });

    await newGalleryItem.save();

    // Retrieve updated gallery items from the database sorted by creation date
    const galleryItems = await GalleryItem.find().sort({ createdAt: -1 });

    // Render the updated page with sorted gallery items
    res.render('addgallery', { galleryItems });
  } catch (error) {
    console.error('Error saving gallery item:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email is a valid email address
    if (!validator.isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    
    // Check if the email is already subscribed
    const existingSubscription = await Subscription.findOne({ email });

    if (existingSubscription) {
      console.log(`Email '${email}' is already subscribed.`);
      return res.status(400).json({ success: false, message: 'Email is already subscribed.' });
    }

    // Save email to MongoDB using the Subscription model
    const subscription = new Subscription({ email });
    await subscription.save();

    // Send confirmation email only to the new subscriber
    
    await sendConfirmationEmail(email);

    // Send success response
    res.status(200).json({ success: true, message: 'Thank you for subscribing! Confirmation email sent.' });
  } catch (error) {
    console.error('Subscription error:', error);
    res.status(500).json({ success: false, message: 'Error subscribing. Please try again.' });
  }
});


// Define a route for handling form submissions
app.post('/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Set up email data
    const mailOptions = {
      from: email,
      to: process.env.EMAIL_USER, // Replace with the recipient email address
      subject: `New Contact Form Submission: ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    // Send success response
    res.status(200).json({ success: true, message: 'Thank you for your message! We will be in contact with you soon.' });
  } catch (error) {
    console.error('Contact form error:', error);
    res.status(500).json({ success: false, message: 'Error submitting the form. Please try again.' });
  }
});

// Add this route to handle the deletion of gallery items
app.post('/delete/:id', async (req, res) => {
  const itemId = req.params.id;

  try {
    // Use Mongoose to find and remove the gallery item by its ID
    const deletedItem = await GalleryItem.findByIdAndDelete(itemId);

    if (!deletedItem) {
      return res.status(404).send('Gallery item not found.');
    }

    // Redirect back to the admin page after deletion
    res.redirect('/addgallery');
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});



async function sendConfirmationEmail(email) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Welcome to Africa Wake Up with Deon Gewers! 🌍`,
    text: `
Hello there! 👋 

I'm Deon Gewers, and I'm thrilled to welcome you to Africa Wake Up – your weekly source for all things tech and inspiration! 🚀

Thank you for subscribing to our newsletter. As a part of our community, you'll receive valuable insights and updates every Tuesday, Thursday, and Friday. Here's what you can look forward to:

📅 **Schedule:**
- **Tuesdays & Thursdays:** Explore the latest tech trends shaping the world.
- **Fridays:** Get a glimpse into my projects, along with coding tips to enhance your skills.

🌟 **What's Inside:**
- **Tech Trends:** Stay informed about the latest in technology.
- **Project Highlights:** Discover the exciting projects I've been working on.
- **Coding Tips:** Learn practical tips to improve your coding skills.

🔗 **Connect with Me:**
Stay connected and join the conversation on social media. Let's explore the fascinating world of tech together!

✉️ **Quick Tips:**
1. **Inbox Priority:** Ensure our emails land in your primary inbox.
2. **Contacts:** Add our email address to your contacts for seamless communication.
3. **Stay Secure:** Mark us as a safe contact for hassle-free updates.

🔗 **Connect with Me:**
Stay connected and join the conversation on LinkedIn: https://www.linkedin.com/in/deon-gewers-60b54a24b/

Let's explore the fascinating world of tech together!

Thank you for being a part of our community. I look forward to sharing the wonders of technology with you!

Happy Coding,
Deon Gewers
`,
  };


  await transporter.sendMail(mailOptions);
}
