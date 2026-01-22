# WERN App - Walk and Earn

## Project Specification Prompt

Create a React Native (Expo) mobile application called **WERN** (Walk and Earn) that rewards users for walking and physical activity. The app should run on iOS, Android, and Web platforms.

---

## Tech Stack Requirements

- **Framework**: React Native with Expo SDK 54+
- **Navigation**: React Navigation (Native Stack + Bottom Tabs)
- **Styling**: StyleSheet with LinearGradient (expo-linear-gradient)
- **Icons**: @expo/vector-icons (Ionicons)
- **State Management**: React Context (ThemeContext, AuthContext)
- **Storage**: @react-native-async-storage/async-storage
- **Build**: EAS CLI for native builds, Gradle for local Android builds

---

## Design Theme

### Background Style
- Gradient background throughout the app: Teal (#1B8A9E) to deeper teal (#0D6E7E)
- Blurred orange/red decorative blob in top-left corner
- Glassmorphism effect on cards (semi-transparent with blur)

### Color Palette
```javascript
// Primary Colors
primary: '#1B8A9E',        // Teal (main brand color)
secondary: '#F5A623',      // Golden yellow (buttons, accents)
accent: '#4CAF50',         // Green (success, earnings)

// Gradient Colors
backgroundGradient: ['#1B8A9E', '#0D6E7E', '#065A6A'],
buttonGradient: ['#F5A623', '#8BC34A'],  // Yellow to green

// Card Colors
cardBackground: 'rgba(255, 255, 255, 0.15)',  // Glassmorphism
cardBorder: 'rgba(255, 255, 255, 0.2)',

// Text Colors
textWhite: '#FFFFFF',
textLight: 'rgba(255, 255, 255, 0.7)',
textMuted: 'rgba(255, 255, 255, 0.5)',

// Feature Icon Colors
earnIcon: '#FF6B6B',       // Coral red
referIcon: '#4ECDC4',      // Teal
connectIcon: '#45B7D1',    // Light blue
protectIcon: '#FF8C42',    // Orange
```

---

## Project Structure

```
src/
├── components/
│   ├── GradientBackground.js    # Main gradient + blob background
│   ├── GlassCard.js             # Glassmorphism card component
│   ├── GradientButton.js        # Yellow-green gradient button
│   ├── FeatureCard.js           # Feature list item (icon + text)
│   ├── OTPInput.js              # 6-digit OTP input component
│   ├── PhoneInput.js            # Phone with country code picker
│   ├── BannerCarousel.js        # Horizontal image carousel
│   ├── ProductCarousel.js       # Product showcase carousel
│   ├── DailyCheckin.js          # 7-day reward check-in
│   ├── ReferralBanner.js        # Invite friend banner
│   ├── Header.js                # Home header with balance
│   └── BottomTabBar.js          # Custom bottom navigation
├── screens/
│   ├── auth/
│   │   ├── OnboardingScreen.js  # Welcome screen with features
│   │   ├── LoginScreen.js       # Email/password login
│   │   ├── SignUpScreen.js      # Registration form
│   │   ├── ForgotPasswordScreen.js  # Send OTP for reset
│   │   └── OTPVerificationScreen.js # Verify email OTP
│   ├── main/
│   │   ├── HomeScreen.js        # Main dashboard
│   │   ├── WalkScreen.js        # Step tracking (center tab)
│   │   └── DigitalVaultScreen.js # Rewards/wallet
│   └── index.js
├── navigation/
│   ├── AuthNavigator.js         # Auth stack
│   ├── MainNavigator.js         # Main app stack
│   ├── BottomTabNavigator.js    # Bottom tabs
│   └── AppNavigator.js          # Root navigator
├── context/
│   ├── AuthContext.js           # Authentication state
│   └── ThemeContext.js          # Theme provider
├── constants/
│   └── colors.js
└── data/
    └── staticData.js
```

---

## Screen Specifications

### 1. Onboarding Screen (OnboardingScreen.js)
**Purpose**: First screen for new users

**Layout**:
- Full gradient background with decorative blob
- Walking person icon (teal figure with green dot + orange star)
- Title: "Welcome to the Future"
- Subtitle: "Transform your daily walks into rewards while building a safer, more connected community."

**Feature Cards** (4 items in glassmorphism cards):
1. **Earn While Walking** - Coral icon (coins), "100 steps = 1 Litty"
2. **Refer & Earn More** - Teal share icon, "Invite friends and earn bonus rewards together"
3. **Connect Safely** - Green people icon, "Meet other walkers and build community bonds"
4. **Stay Protected** - Orange shield icon, "Report issues and help keep your city safe"

**Buttons**:
- "Get Started" - Yellow-green gradient, arrow icon (→))
- "I already have an account" - Teal outline/text button

---

### 2. Login Screen (LoginScreen.js)
**Purpose**: Existing user authentication

**Layout**:
- Gradient background with blob
- Title: "Welcome Back"
- Subtitle: "Continue your journey to a healthier, more connected life"

**Form Fields** (in glassmorphism card):
- Email Address (white rounded input)
- Password (white rounded input with eye toggle)
- Remember me checkbox + "Forgot password?" link

**Buttons**:
- "Sign In" - Yellow-green gradient with arrow icon (→))
- "Or continue with" divider
- "Don't have an account? **Sign up**" link

---

### 3. Sign Up Screen (SignUpScreen.js)
**Purpose**: New user registration

**Form Fields** (in glassmorphism card):
- Full Name
- Email Address
- Phone Number (with country code dropdown +1)
- Password
- Confirm Password
- Referral Code (optional)

**Button**:
- "Sign Up" - Yellow-green gradient

**Footer**: "Already have an account? **Sign In**"

---

### 4. Forgot Password Screen (ForgotPasswordScreen.js)
**Purpose**: Password reset via email OTP

**Layout**:
- Title: "Welcome Back"
- Subtitle: "Continue your journey to a healthier, more connected life"

**Form**:
- Email Address input

**Buttons**:
- "Send OTP" - Yellow-green gradient
- "Back to Login" - Text link

---

### 5. OTP Verification Screen (OTPVerificationScreen.js)
**Purpose**: Verify email with 6-digit code

**Layout** (centered glassmorphism card):
- Title: "Verification Code"
- Subtitle: "We have sent the verification code to your email address [email]"
- 6 individual OTP input boxes (glassmorphism style)
- "Verify" button - Yellow-green gradient
- "Did not receive the code? **Resend in XXs**"
- "Back to Signup" link

---

### 6. Home Screen (HomeScreen.js)
**Purpose**: Main dashboard after login

**Header**:
- WERN logo (walking figure with star)
- Litties balance chip: "🟢 511 Litties"
- Notification bell icon
- User avatar (circular)

**Greeting Section**:
- "Good Afternoon, [Name]!"
- "Ready to earn some rewards?"
- Weather widget: Cloud icon + "24.0°C"

**Banner Carousel**:
- Promotional banners (e.g., "Kids Walk for Labubu")
- Dot pagination indicators

**Product Carousel**:
- Prize items (e.g., "Apple Watch Series 10", "iPhone")
- Horizontal scroll with cards

**Bottom Tab Navigation**:
- Home (house icon) - left
- Walk (walking figure in yellow circle) - center, elevated
- Digital Vault (folder icon) - right

**Referral Banner**:
- "Invite a friend, get 10 litties"
- "Get 10 Litties" button

**Promotional Card**:
- "Win a Yacht Trip Gift Card!"
- "Claim Daily Rewards in the next 7 days and earn an entry into Prize Draw each day!"
- Image of yacht

**Daily Check-in Section**:
- "Daily Checkin" label
- "Time left: 09:10:30" countdown
- "Claim" button
- 7-day reward grid:
  - Day 1: ✓ (completed)
  - Day 2: 5 litties (current)
  - Day 3: 10 litties
  - Day 4: 10 litties
  - Day 5: 15 litties
  - Day 6: 15 litties
  - Day 7: 20 litties

---

## Component Specifications

### GradientButton
```javascript
// Yellow to green gradient button with arrow icon
<LinearGradient
  colors={['#F5A623', '#8BC34A']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 0 }}
  style={styles.button}
>
  <Text>→) Button Text</Text>
</LinearGradient>
```

### GlassCard
```javascript
// Semi-transparent card with blur effect
{
  backgroundColor: 'rgba(255, 255, 255, 0.12)',
  borderRadius: 24,
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.2)',
  padding: 24,
}
```

### OTPInput
- 6 separate input boxes
- Auto-focus to next on input
- Glassmorphism style boxes
- White text, centered

---

## Currency System

- **Litty/Litties**: In-app currency
- Conversion: **100 steps = 1 Litty**
- Display format: Green dot + number + "Litties" (e.g., "🟢 511 Litties")

---

## Bottom Tab Navigation

| Tab | Icon | Label | Screen |
|-----|------|-------|--------|
| Left | House outline (rounded square bg) | Home | HomeScreen |
| Center | Walking person (elevated yellow circle, dashed border) | Walk | WalkScreen |
| Right | Wallet icon | Digital Vault | DigitalVaultScreen |

### Bottom Tab Bar Styling
```javascript
// Tab bar background - semi-transparent with blur
tabBarBackground: 'rgba(255, 255, 255, 0.15)',

// Home & Digital Vault tabs - subtle rounded square background
tabIconContainer: {
  backgroundColor: 'rgba(255, 255, 255, 0.2)',
  borderRadius: 12,
  padding: 8,
}

// Center Walk button - elevated golden circle
walkButton: {
  backgroundColor: '#F5A623',  // Golden yellow
  width: 70,
  height: 70,
  borderRadius: 35,
  borderWidth: 2,
  borderStyle: 'dashed',
  borderColor: '#F5A623',
  marginTop: -35,  // Elevate above tab bar
  justifyContent: 'center',
  alignItems: 'center',
}

// Walk icon - black walking person silhouette
walkIcon: {
  color: '#000000',
  size: 28,
}
```

---

## Build & Development Commands

```bash
# Development
npm start              # Start Expo dev server
npm run web           # Start web version
npm run android       # Run on Android
npm run ios           # Run on iOS

# Build APK (Android)
cd android && ./gradlew assembleRelease

# Build Bundle (Android)
cd android && ./gradlew bundleRelease
```

---

## app.json Configuration

```json
{
  "expo": {
    "name": "WERN",
    "slug": "wern-app",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#1B8A9E"
    },
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.wernapp"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#1B8A9E"
      },
      "package": "com.yourcompany.wernapp"
    },
    "web": {
      "favicon": "./assets/favicon.png",
      "bundler": "metro"
    }
  }
}
```

---

## package.json Dependencies

```json
{
  "dependencies": {
    "@expo/vector-icons": "^15.0.3",
    "@react-native-async-storage/async-storage": "^1.24.0",
    "@react-navigation/bottom-tabs": "^7.9.1",
    "@react-navigation/native": "^7.1.27",
    "@react-navigation/native-stack": "^7.9.1",
    "expo": "~54.0.31",
    "expo-linear-gradient": "~15.0.8",
    "expo-status-bar": "~3.0.9",
    "react": "19.1.0",
    "react-dom": "19.1.0",
    "react-native": "0.81.5",
    "react-native-gesture-handler": "~2.28.0",
    "react-native-reanimated": "~4.1.1",
    "react-native-safe-area-context": "^5.6.2",
    "react-native-screens": "~4.16.0",
    "react-native-web": "^0.21.0"
  }
}
```

---

## Navigation Flow

```
App
├── AuthNavigator (not logged in)
│   ├── Onboarding
│   ├── Login
│   ├── SignUp
│   ├── ForgotPassword
│   └── OTPVerification
│
└── MainNavigator (logged in)
    └── BottomTabNavigator
        ├── Home
        ├── Walk (center)
        └── DigitalVault
```

---

## Key Implementation Notes

1. **Gradient Background**: Use `expo-linear-gradient` with decorative blurred blob overlay
2. **Glassmorphism**: Semi-transparent cards with subtle border
3. **Button Style**: All primary buttons use yellow-to-green gradient with "→)" prefix
4. **Input Style**: White background, large border-radius (20-24px)
5. **Typography**: White text on gradient backgrounds
6. **Safe Area**: Handle with `useSafeAreaInsets()`
7. **OTP Input**: Auto-advance focus, 6 separate inputs

---

## Assets Needed

- WERN logo (walking figure with star)
- Onboarding illustration (walking person)
- Feature icons (coins, share, people, shield)
- Banner images for carousel
- Product images for prizes
- User avatar placeholder
