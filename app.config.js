import * as dotenv from 'dotenv';

dotenv.config();

export default {
  "expo": {
    "name": "Laundrify DryCleaners",
    "slug": "laundrify-drycleaners",
    "version": "1.0.0",
    "orientation": "portrait",
    "scheme": "laundrify-drycleaners",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#bbd2f0",
      "duration": 3000,
      "imageStyle": {
        "width": 180,
        "height": 180
      }
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "icon": "./assets/icon.png",
      "bundleIdentifier": "com.edikan.laundrifydrycleaners",
      "googleServicesFile": "./GoogleService-Info.plist",
      "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#bbd2f0"
      },
      "package": "com.edikan.laundrifydrycleaners",
      "googleServicesFile": "./google-services.json"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#bbd2f0",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ],
      "expo-mail-composer"
    ],
    "extra": {
      "eas": {
        "projectId": "b6aa89ad-7078-42cc-9a09-e4e0437dcdc0"
      },
      "firebaseConfig": {
        "apiKey": process.env.FIREBASE_API_KEY,
        "authDomain": process.env.FIREBASE_AUTH_DOMAIN,
        "projectId": process.env.FIREBASE_PROJECT_ID,
        "storageBucket": process.env.FIREBASE_STORAGE_BUCKET,
        "messagingSenderId": process.env.FIREBASE_MESSAGING_SENDER_ID,
        "appId": process.env.FIREBASE_APP_ID,
        "measurementId": process.env.FIREBASE_MEASUREMENT_ID
      }
    }
  }
};