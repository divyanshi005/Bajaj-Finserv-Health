require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// --- Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '64kb' }));
app.use(morgan('tiny'));

// --- Configuration (env with safe defaults for quick start)
const EMAIL = process.env.EMAIL || 'john@xyz.com';
const ROLL_NUMBER = process.env.ROLL_NUMBER || 'ABCD123';
const FULL_NAME = (process.env.FULL_NAME || 'john doe').toLowerCase().trim().replace(/\s+/g, '_');
const DOB_DDMMYYYY = process.env.DOB_DDMMYYYY || '17091999';

// Helpers
const isAlpha = (s) => /^[A-Za-z]+$/.test(s);
const isIntegerString = (s) => /^[+-]?\d+$/.test(s);
const toUpper = (s) => s.toUpperCase();

// Build alternating-caps reversed concat string from all letters
function buildConcatString(allTokens) {
  // collect all alphabetic chars in order
  const letters = [];
  for (const token of allTokens) {
    if (typeof token !== 'string') continue;
    for (const ch of token) {
      if (/[A-Za-z]/.test(ch)) letters.push(ch);
    }
  }
  // reverse and apply alternating caps starting Upper
  letters.reverse();
  let upper = true;
  return letters
    .map((ch) => {
      const out = upper ? ch.toUpperCase() : ch.toLowerCase();
      upper = !upper;
      return out;
    })
    .join('');
}

// Core route
app.post('/bfhl', (req, res) => {
  try {
    const { data } = req.body || {};

    if (!Array.isArray(data)) {
      return res.status(400).json({
        is_success: false,
        user_id: `${FULL_NAME}_${DOB_DDMMYYYY}`,
        email: EMAIL,
        roll_number: ROLL_NUMBER,
        odd_numbers: [],
        even_numbers: [],
        alphabets: [],
        special_characters: [],
        sum: "0",
        concat_string: "",
        message: "Invalid payload: 'data' must be an array."
      });
    }

    const odd_numbers = [];
    const even_numbers = [];
    const alphabets = [];
    const special_characters = [];

    let sum = 0;

    for (const token of data) {
      // Normalize non-string tokens to string (but classification rules still apply)
      const s = typeof token === 'string' ? token : String(token);

      if (isIntegerString(s)) {
        // Numbers must be returned as strings
        const n = parseInt(s, 10);
        sum += n;
        if (Math.abs(n) % 2 === 0) {
          even_numbers.push(s);
        } else {
          odd_numbers.push(s);
        }
      } else if (isAlpha(s)) {
        alphabets.push(toUpper(s));
      } else {
        special_characters.push(s);
      }
    }

    const payload = {
      is_success: true,
      user_id: `${FULL_NAME}_${DOB_DDMMYYYY}`,
      email: EMAIL,
      roll_number: ROLL_NUMBER,
      odd_numbers,
      even_numbers,
      alphabets,
      special_characters,
      sum: String(sum),
      concat_string: buildConcatString(data)
    };

    return res.status(200).json(payload);
  } catch (err) {
    // Graceful error handling
    return res.status(500).json({
      is_success: false,
      user_id: `${FULL_NAME}_${DOB_DDMMYYYY}`,
      email: EMAIL,
      roll_number: ROLL_NUMBER,
      odd_numbers: [],
      even_numbers: [],
      alphabets: [],
      special_characters: [],
      sum: "0",
      concat_string: "",
      message: "Internal server error"
    });
  }
});

// Optional: basic health/info
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    endpoints: ['POST /bfhl'],
    example: { data: ["a", "1", "334", "4", "R", "$"] }
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`BFHL API listening on port ${PORT}`);
});
