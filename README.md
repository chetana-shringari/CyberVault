# CyberVault

A secure file encryption and decryption web application built with Node.js, Express, and AES-256-GCM encryption.

## Features

- **File Encryption**: Upload files and encrypt them with a password-derived key using AES-256-GCM.
- **File Decryption**: Decrypt uploaded encrypted files or select from server-stored files.
- **Server File Management**: List, download, and manage encrypted/decrypted files stored on the server.
- **Profile Upload**: Upload profile images.
- **Social Links**: Store and retrieve GitHub and LinkedIn links.

## Project Structure

```
cyber/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables (PORT)
├── README.md              # This file
├── data/                  # Directory for encrypted/decrypted files and social data
│   ├── social.json        # Stored social links
│   └── *.enc/*.dec        # Encrypted/decrypted files
├── public/                # Static web files
│   ├── index.html         # Main page
│   ├── about.html         # About page
│   ├── features.html      # Features page
│   ├── profile.html       # Profile page
│   ├── style.css          # Stylesheet
│   └── profile.jpg        # Uploaded profile image
└── uploads/               # Temporary upload directory
```

## Installation

1. Clone the repository:
   ```
   git clone <your-repo-url>
   cd cyber
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. (Optional) Create a `.env` file to set the port:
   ```
   PORT=3000
   ```

## Running the Application

Start the server:
```
npm start
```

For development with auto-restart:
```
npm run dev
```

The application will be available at `http://localhost:3000`.

## API Endpoints

- `GET /` - Serve the main page
- `POST /encrypt` - Encrypt an uploaded file
- `POST /decrypt` - Decrypt an uploaded file
- `GET /files` - List encrypted files on server
- `POST /decrypt-file` - Decrypt a server file by name
- `GET /dec-files` - List decrypted files on server
- `GET /download?name=filename` - Download a file from server
- `POST /upload-profile` - Upload profile image
- `GET /social` - Get social links
- `POST /save-social` - Save social links

## Security Notes

- Files are encrypted using AES-256-GCM with password-derived keys via scrypt.
- Uploaded files are temporarily stored in `uploads/` and moved to `data/` after processing.
- Server-stored files are in `data/` directory.
- No authentication is implemented; this is for demonstration purposes.

## Technologies Used

- Node.js
- Express.js
- Multer (file uploads)
- Crypto (encryption)
- HTML/CSS/JavaScript (frontend)

## License

ISC