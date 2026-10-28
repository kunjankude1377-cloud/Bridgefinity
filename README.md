# Bridgefinity

Bridgefinity is a static frontend for a volunteer-matching and NGO coordination platform built with Firebase Auth and Firestore.

## Project setup

1. Replace the Firebase config values in `firebase-config.js` with your project settings.
2. Enable Firebase Authentication and Firestore in the Firebase console.
3. Deploy the Firestore rules from `firestore.rules`.
4. Configure a secure email backend and set the endpoint in `window.BRIDGEFINITY_EMAIL_CONFIG`.

## Secure email handling

This project intentionally does not store email service secrets in frontend JavaScript.

Use a backend or Cloud Function endpoint such as:

`https://us-central1-your-project.cloudfunctions.net/sendBridgefinityEmail`

The frontend sends an authenticated request including the Firebase ID token in the `Authorization` header. The backend validates the request, then sends the email using the secret provider credentials.

## Important

The static frontend can only confirm that a request was sent to the backend, not that the email provider accepted it. The backend must respond with `{ "sent": true }` before the app can reasonably claim that an email was sent.

## Local verification

Open the frontend in a browser and ensure the site works after Firebase config is connected.

## Production deployment

Deploy the static site to GitHub Pages and confirm:
- Auth works
- Firestore works
- Notifications render correctly
- Security rules are live
- Email backend responds successfully
