const express = require('express');
const mongoose = require('mongoose');
const shortid = require('shortid');
const cors = require('cors');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/happyreferrals', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// Schema
const referralSchema = new mongoose.Schema({
  solAddress: { type: String, required: true, unique: true },
  referralCode: { type: String, required: true, unique: true, default: shortid.generate },
  referralCount: { type: Number, default: 0 },
});

const Referral = mongoose.model('Referral', referralSchema);

// API Endpoints
// Generate Referral Link and Store Address
app.post('/api/referral/generate', async (req, res) => {
  const { solAddress } = req.body;

  try {
    // Check if address already exists
    let referral = await Referral.findOne({ solAddress });

    if (!referral) {
      referral = new Referral({ solAddress });
      await referral.save();
    }

    res.json({ referralCode: referral.referralCode });
  } catch (error) {
    console.error("Error generating referral:", error);
    res.status(500).json({ error: 'Failed to generate referral link' });
  }
});

// Increment Referral Count
app.post('/api/referral/increment', async (req, res) => {
  const { referralCode } = req.body;

  try {
    const referral = await Referral.findOne({ referralCode });

    if (referral) {
      referral.referralCount += 1;
      await referral.save();
      res.json({ message: 'Referral count incremented' });
    } else {
      res.status(404).json({ error: 'Referral code not found' });
    }
  } catch (error) {
    console.error("Error incrementing referral count:", error);
    res.status(500).json({ error: 'Failed to increment referral count' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});