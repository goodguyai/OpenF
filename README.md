# Creator App

A platform for sports writers and fantasy football analysts to monetize their content through AI-powered chat. Creators create organizations, sync their Google Drive content via Ragie, and users can subscribe to orgs to ask questions powered by creator expertise.

## Features

- **Creator Signup** - Sports writers/analysts create an org and connect their Google Drive
- **Organization-based** - Content is organized by org, allowing multiple creators per org (future)
- **Ragie Integration** - Automatic syncing of content (articles, rankings, analysis)
- **AI Chat** - Users ask fantasy football questions, get answers powered by creator content
- **Content Isolation** - Each org's content is partitioned and searchable separately

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Auth & Database**: Firebase (Authentication + Firestore)
- **Content Sync**: Ragie (Google Drive connector + retrieval API)
- **AI**: OpenAI (GPT-4o-mini)
- **Styling**: Tailwind CSS

---

## Data Model

```
orgs/{orgId}
  - name: string              # Organization name
  - ownerId: string           # Creator who owns the org
  - ragieConnectionId: string # Ragie connection for Google Drive
  - createdAt, updatedAt

users/{userId}
  - email: string
  - roles: ["creator"] | ["user"]
  - orgId: string | null           # For creators - org they belong to
  - subscribedOrgIds: string[]     # For users - orgs they can query
  - createdAt, updatedAt
```

---

## Prerequisites

- Node.js 18+ 
- npm or yarn
- A Google account (for Firebase)
- A Ragie account ([ragie.ai](https://ragie.ai))
- An OpenAI account ([platform.openai.com](https://platform.openai.com))

---

## Setup Guide

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd creator-app
npm install
```

### 2. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Enter a project name (e.g., "creator-app")
4. Disable Google Analytics (optional, not needed)
5. Click **"Create project"**

#### Enable Authentication

1. In your Firebase project, go to **Build → Authentication**
2. Click **"Get started"**
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click **Save**

#### Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** (we'll add rules later)
4. Select a location close to your users
5. Click **"Enable"**

#### Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll down to **"Your apps"**
3. Click the web icon (`</>`) to add a web app
4. Register the app (name doesn't matter, don't enable Hosting)
5. Copy the config values - you'll need:
   - `apiKey`
   - `authDomain`
   - `projectId`

### 3. Set Up Ragie

1. Go to [ragie.ai](https://ragie.ai) and create an account
2. Navigate to **Settings → API Keys**
3. Create a new API key
4. Copy the key (starts with `tnt_...`)

### 4. Set Up OpenAI

1. Go to [platform.openai.com](https://platform.openai.com)
2. Navigate to **API Keys**
3. Create a new secret key
4. Copy the key (starts with `sk-...`)

### 5. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

```env
# Firebase (from your Firebase project settings)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id

# Ragie (from ragie.ai dashboard)
RAGIE_API_KEY=tnt_your_ragie_key

# OpenAI (from platform.openai.com)
OPENAI_API_KEY=sk-your_openai_key

# App URL (use localhost for development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 6. Deploy Firestore Security Rules

1. Go to **Firebase Console → Firestore Database → Rules**
2. Copy the contents of `firestore.rules` from this project
3. Click **"Publish"**

### 7. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Usage

### For Creators

1. Go to `/signup` to create a creator account with your organization name
2. Once logged in, click **"Connect Google Drive"**
3. Authorize with Google and select a folder containing your content
4. Wait for Ragie to sync (can take a few minutes)
5. Go to `/chat` to test your AI chatbot

### For Users

1. Go to `/signup/user` to create a user account
2. Once logged in, you're taken to the chat interface
3. Ask questions about fantasy football
4. (Note: Users need to subscribe to an org to get answers - subscription UI coming soon)

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx        # Login page
│   │   └── signup/
│   │       ├── page.tsx          # Creator signup (creates org)
│   │       └── user/page.tsx     # User signup
│   ├── (chat)/
│   │   ├── layout.tsx            # Chat auth guard
│   │   └── chat/page.tsx         # Chat interface
│   ├── (dashboard)/
│   │   ├── layout.tsx            # Dashboard auth guard + navbar
│   │   └── dashboard/page.tsx    # Creator dashboard
│   ├── api/
│   │   ├── chat/route.ts         # Chat API (Ragie + OpenAI)
│   │   └── ragie/
│   │       ├── init-connection/route.ts  # Start Ragie OAuth
│   │       └── callback/route.ts         # Handle Ragie redirect
│   ├── layout.tsx                # Root layout with AuthProvider
│   └── page.tsx                  # Root redirect
├── components/
│   └── dashboard/
│       └── ConnectGoogleDrive.tsx
├── contexts/
│   └── AuthContext.tsx           # Firebase auth + org state
└── lib/
    ├── firebase/
    │   └── client.ts             # Firebase client SDK
    └── ragie.ts                  # Ragie API helpers
```

---

## How It Works

### Content Flow

1. **Creator creates org** → Org document created in Firestore
2. **Creator connects Google Drive** → Ragie syncs to org's partition
3. **Content is partitioned** → Each org's data is isolated using org ID
4. **Automatic updates** → Ragie re-syncs every 4 hours

### Chat Flow

1. **User asks a question** → Sent to `/api/chat`
2. **Determine org** → Creator queries their org; user queries subscribed org
3. **Ragie retrieval** → Searches org's partition for relevant content
4. **OpenAI generation** → Uses retrieved context to generate answer
5. **Response** → Returned with source citations

### Security

- Firebase Auth handles all authentication
- Firestore rules ensure users can only access/modify appropriate data
- Org owners can update their org's Ragie connection
- API keys (Ragie, OpenAI) are server-side only
- Content is partitioned per org in Ragie

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | Firebase API key (public) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | Firebase project ID |
| `RAGIE_API_KEY` | Yes | Ragie API key (server-only) |
| `OPENAI_API_KEY` | Yes | OpenAI API key (server-only) |
| `NEXT_PUBLIC_APP_URL` | Yes | Your app's URL |

---

## Troubleshooting

### "Firebase: Error (auth/api-key-not-valid)"
- Check that your `.env` file has the correct Firebase API key
- Make sure there's no `.env.local` overriding your values
- Restart the dev server after changing env vars

### Ragie connection fails with "partition" error
- Org IDs must be converted to lowercase for Ragie partitions
- The code handles this automatically

### Chat returns "no data from creators"
- Make sure your Google Drive folder has content
- Wait a few minutes for Ragie to finish syncing
- Check the terminal logs for Ragie retrieval results

### Firestore permission denied
- Make sure you've published the security rules from `firestore.rules`
- Verify the user is authenticated
- Check that the document structure matches the rules

---

## Future Enhancements

- [ ] User org subscription UI
- [ ] Multiple creators per org
- [ ] Org admin roles
- [ ] Usage analytics/billing
- [ ] Org discovery/marketplace

---

## License

MIT
