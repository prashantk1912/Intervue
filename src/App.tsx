// src/App.tsx

import React, { useEffect, useState } from 'react';
import {
  StreamVideoClient,
  StreamVideo,
  Call, // Type definition for the call object
  StreamCall, // React component for rendering the call context
  useCall,
  ParticipantView, // Import ParticipantView to render individual participant videos
} from '@stream-io/video-react-sdk';

// Import Lucide React icons
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, MessageSquare, CircleDot, LogIn, PlusCircle, UserCheck } from 'lucide-react';

// Import Stream styles (still needed for Stream's base components)
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './App.css'; // Your custom CSS

// Firebase imports
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

// --- YOUR ACTUAL FIREBASE CONFIGURATION GOES HERE ---
const appId = "video-interview-platform-app"; // Your Firebase Project ID
const firebaseConfig = {
  apiKey: "AIzaSyCGrPN42ebEljSXZyVlxddXajB0kn8rCyA",
  authDomain: "video-interview-platform-app.firebaseapp.com",
  projectId: "video-interview-platform-app",
  storageBucket: "video-interview-platform-app.firebasestorage.app",
  messagingSenderId: "884330578336",
  appId: "1:884330578336:web:1cf05b259a061c9b1e24c5",
  measurementId: "G-M4V2Z8MCM5"
};

// Initialize Firebase App and Services
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// --- Your actual Stream API Key ---
const apiKey = '2raj8ju2bgdw';

// --- Stream API Secret (NEEDED FOR LOCAL TOKEN GENERATION) ---
// IMPORTANT: In a real production app, this secret should NEVER be in client-side code.
// It should only be used on your backend server to generate tokens.
const streamApiSecret = 'khf8p9465rf9q22j6af7bxykhnwwdggh9neceppcq76zkk2b87mngt74yjyxc67e';

// -------------------------------------------------------------------------------
// Helper function to generate a unique room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// Helper function to generate a Stream JWT token locally (for development only)
// In production, this should be done on your backend.
async function generateStreamUserToken(userId: string, apiSecret: string): Promise<string> {
  // This is a simplified JWT generation for demonstration.
  // In a real app, you'd use a proper JWT library on your backend.
  const header = {
    alg: "HS256",
    typ: "JWT",
  };
  const payload = {
    user_id: userId,
  };

  const base64UrlEncode = (obj: any) => {
    const json = JSON.stringify(obj);
    const base64 = btoa(json); // Base64 encode
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, ''); // Base64Url
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const data = `${encodedHeader}.${encodedPayload}`;

  // This part requires a crypto library that works in the browser for HMAC-SHA256.
  // For simplicity and to avoid adding complex browser crypto polyfills,
  // we'll instruct the user to generate the token manually for their current Firebase UID.
  // In a real app, you'd fetch this from your backend.
  console.warn("IMPORTANT: For local testing, you need to manually generate a Stream user token for this Firebase user ID.");
  console.warn(`Go to Stream JWT Generator: https://getstream.io/chat/docs/php/token_generator/`);
  console.warn(`Enter User ID: ${userId}`);
  console.warn(`Enter API Secret: ${apiSecret}`); // Use the provided apiSecret
  console.warn(`Copy the generated token and update the 'currentStreamUserToken' variable in App.tsx.`);
  
  // For now, we'll throw an error to halt execution until the token is updated.
  // In a real app, you'd fetch this from your backend.
  // This line is intentionally left here to remind you of the manual step
  // if your Firebase UID changes (e.g., if you clear site data).
  throw new Error("Stream token generation requires backend or manual step for local testing.");
}


// -------------------------------------------------------------------------------
// 2. Component to display the video call
function MyVideoCall({ currentCallId }: { currentCallId: string }) {
  const call = useCall(); // Get the current call object from context
  const participants = call?.state.participants || []; 

  // State for local media controls
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // Functions to toggle media and screen share using call object methods
  const toggleMicrophone = async () => {
    if (!call) return;
    if (isMicrophoneEnabled) {
      await call.microphone.disable();
      setIsMicrophoneEnabled(false);
    } else {
      await call.microphone.enable();
      setIsMicrophoneEnabled(true);
    }
  };

  const toggleCamera = async () => {
    if (!call) return;
    if (isCameraEnabled) {
      await call.camera.disable();
      setIsCameraEnabled(false);
    } else {
      await call.camera.enable();
      setIsCameraEnabled(true);
    }
  };

  const toggleScreenShare = async () => {
    if (!call) return;
    if (isScreenSharing) {
      await call.screenShare.disable(); 
      setIsScreenSharing(false);
    } else {
      try {
        await call.screenShare.enable(); 
        setIsScreenSharing(true);
      } catch (error) {
        console.error("Failed to start screen share:", error);
        alert("Failed to start screen share. Please ensure permissions are granted and no other app is sharing.");
        setIsScreenSharing(false); // Reset state if failed
      }
      }
  };

  const leaveCall = async () => {
    if (!call) return;
    await call.leave();
    // In a real app, you might redirect the user after leaving the call
    window.location.reload(); // Simple reload to go back to lobby
  };

  if (!call) {
    return <div className="connecting-message">No active call found or still connecting.</div>;
  }

  return (
    <div className="my-video-call-container">
      <h1 className="call-title">Welcome to the Interview Call!</h1>
      <p className="call-id">Call ID: {currentCallId}</p> {/* Display current call ID */}
      
      {/* This div will contain the video grid */}
      <div className="video-grid-container">
        {/* Render each participant's video using ParticipantView */}
        {participants.length > 0 ? (
          participants.map((p) => (
            <div key={p.sessionId} className="participant-video-wrapper">
              <ParticipantView participant={p} />
              {/* Optional: Display participant name over video */}
              <div className="participant-name">
                {p.name || p.userId}
              </div>
            </div>
          ))
        ) : (
          <div className="waiting-message">Waiting for participants...</div>
        )}
      </div>

      {/* Custom Call Controls with Icons */}
      <div className="call-controls">
        {/* Mic Toggle Button */}
        <button
          onClick={toggleMicrophone}
          className="control-button mic-button"
          title={isMicrophoneEnabled ? "Mute Mic" : "Unmute Mic"}
        >
          {isMicrophoneEnabled ? <Mic size={28} /> : <MicOff size={28} />}
        </button>

        {/* Camera Toggle Button */}
        <button
          onClick={toggleCamera}
          className="control-button camera-button"
          title={isCameraEnabled ? "Turn Off Camera" : "Turn On Camera"}
        >
          {isCameraEnabled ? <Video size={28} /> : <VideoOff size={28} />}
        </button>

        {/* Screen Share Toggle Button */}
        <button
          onClick={toggleScreenShare}
          className="control-button screen-share-button"
          title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
        >
          {isScreenSharing ? <ScreenShareOff size={28} /> : <ScreenShare size={28} />}
        </button>

        {/* Leave Call Button */}
        <button
          onClick={leaveCall}
          className="control-button leave-button"
          title="Leave Call"
        >
          <PhoneOff size={28} />
        </button>

        {/* Placeholder for Reactions (disabled) */}
        <button
          className="control-button disabled-button"
          title="Reactions (Not Implemented)"
          disabled
        >
          <MessageSquare size={28} />
        </button>

        {/* Placeholder for Record Call (disabled) */}
        <button
          className="control-button disabled-button"
          title="Record Call (Not Implemented)"
          disabled
        >
          <CircleDot size={28} />
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------------------------
// 3. Main Application Component
function App() {
  // State for Firebase user and authentication readiness
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // State for Stream client and call
  const [streamClient, setStreamClient] = useState<StreamVideoClient | undefined>(undefined);
  const [call, setCall] = useState<Call | undefined>(undefined);

  // State for lobby/room management
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'interviewer' | 'candidate' | ''>('');
  const [roomCode, setRoomCode] = useState('');
  const [showCall, setShowCall] = useState(false); // Controls showing video call UI

  // --- Firebase Authentication Effect ---
  useEffect(() => {
    const setupAuth = async () => {
      await signInAnonymously(auth);
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setIsAuthReady(true);
    });

    setupAuth();
    return () => unsubscribe(); // Cleanup auth listener
  }, []);

  // --- Stream Client and Call Setup Effect ---
  useEffect(() => {
    if (!isAuthReady || !showCall || !username || !roomCode || !firebaseUser) {
      // Ensure firebaseUser is available before proceeding to Stream setup
      return;
    }

    const setupStream = async () => {
      const streamUserId = firebaseUser.uid; // Use the authenticated Firebase UID

      let currentStreamUserToken: string;
      try {
        // In a real app, this would be a fetch call to your backend
        // For local development, you need to manually generate this token for the current firebaseUser.uid
        // and paste it here for testing.
        // This is a temporary workaround for local development.
        // For production, you MUST have a backend service to generate Stream tokens.
        
        // As we cannot programmatically generate JWT in browser easily without adding more libs,
        // we will instruct the user to manually get this token.
        console.warn("IMPORTANT: For local testing, you need to manually generate a Stream user token for this Firebase user ID.");
        console.warn(`Go to Stream JWT Generator: https://getstream.io/chat/docs/php/token_generator/`);
        console.warn(`Enter User ID: ${streamUserId}`);
        console.warn(`Enter API Secret: ${streamApiSecret}`); // Use the provided apiSecret
        console.warn(`Copy the generated token and update the 'currentStreamUserToken' variable in App.tsx.`);
        
        // For now, we'll throw an error to halt execution until the token is updated.
        // In a real app, you'd fetch this from your backend.
        currentStreamUserToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiMGdVN3RPOUZYOFRvZklUZG8yeUFkb1BPSmd4MiJ9.cThRcV94-vm-xA63Mx0NGFWv4_nOCoQ2p7qN3mhGgGM'; // THIS IS THE MANUALLY PASTED TOKEN
        
        // Example if you had a backend endpoint:
        // const response = await fetch('/api/generate-stream-token', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ userId: streamUserId })
        // });
        // const data = await response.json();
        // currentStreamUserToken = data.token;

      } catch (tokenError) {
        console.error('Error generating Stream token:', tokenError);
        alert('Failed to generate Stream token. See console for instructions.');
        setShowCall(false); // Go back to lobby on token generation failure
        return;
      }

      // Initialize Stream client
      const clientInstance = StreamVideoClient.getOrCreateInstance({
        apiKey,
        user: {
          id: streamUserId,
          name: username,
          image: `https://getstream.io/random_svg/?id=${streamUserId}&name=${username}`,
        },
        token: currentStreamUserToken, // Use the dynamically obtained token
      });
      setStreamClient(clientInstance);

      // Create and join the call
      const newCall = clientInstance.call('default', roomCode);
      newCall.join({ create: true })
        .then(() => setCall(newCall))
        .catch(error => {
          console.error('Failed to join call:', error);
          alert('Failed to join call. Please check the room code and try again.');
          setShowCall(false); // Go back to lobby on join failure
        });
    };

    setupStream();

    return () => {
      if (call) {
        call.leave().catch(console.error);
      }
    };
  }, [isAuthReady, showCall, username, roomCode, firebaseUser]); // Dependencies for this effect

  // --- Lobby Functions ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && role) {
      // Logic for creating/joining rooms will be here
    } else {
      alert('Please enter your name and select a role.');
    }
  };

  const handleCreateRoom = async () => {
    if (!firebaseUser) {
      alert('Authentication not ready. Please wait.');
      return;
    }
    const newRoomId = generateRoomId();
    try {
      // Store room details in Firestore
      await setDoc(doc(db, `artifacts/${appId}/public/data/interviewRooms`, newRoomId), {
        roomId: newRoomId,
        interviewerId: firebaseUser.uid,
        createdAt: new Date(),
      });
      setRoomCode(newRoomId);
      setShowCall(true); // Show the call UI
    } catch (error) {
      console.error('Error creating room:', error);
      alert('Failed to create room. Please try again.');
    }
  };

  const handleJoinRoom = async () => {
    if (!firebaseUser) {
      alert('Authentication not ready. Please wait.');
      return;
    }
    if (!roomCode) {
      alert('Please enter a room code to join.');
      return;
    }
    try {
      // Check if room exists in Firestore
      const roomDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/interviewRooms`, roomCode));
      if (roomDoc.exists()) {
        setShowCall(true); // Show the call UI
      } else {
        alert('Room not found. Please check the code.');
      }
    } catch (error) {
      console.error('Error joining room:', error);
      alert('Failed to join room. Please try again.');
    }
  };

  // --- Conditional Rendering ---
  if (!isAuthReady) {
    return <div className="connecting-message">Authenticating...</div>;
  }

  if (!showCall) {
    // Lobby UI
    return (
      <div className="lobby-container">
        <h1 className="lobby-title">Interview Platform</h1>
        <form onSubmit={handleLogin} className="form-card">
          <div className="form-group">
            <label htmlFor="username" className="form-label">Your Name:</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="e.g., John Doe"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Select Role:</label>
            <div className="radio-group">
              <label className="radio-label">
                <input
                  type="radio"
                  name="role"
                  value="interviewer"
                  checked={role === 'interviewer'}
                  onChange={() => setRole('interviewer')}
                  className="form-radio"
                />
                Interviewer
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="role"
                  value="candidate"
                  checked={role === 'candidate'}
                  onChange={() => setRole('candidate')}
                  className="form-radio"
                />
                Candidate
              </label>
            </div>
          </div>

          {role === 'interviewer' && (
            <button
              type="button" // Important: type="button" to prevent form submission
              onClick={handleCreateRoom}
              className="action-button create-room-button"
            >
              <PlusCircle size={24} /> Create New Interview Room
            </button>
          )}

          {role === 'candidate' && (
            <>
              <div className="form-group">
                <label htmlFor="roomCode" className="form-label">Room Code:</label>
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="form-input"
                  placeholder="Enter Room Code"
                  required
                />
              </div>
              <button
                type="button" // Important: type="button" to prevent form submission
                onClick={handleJoinRoom}
                className="action-button join-room-button"
              >
                <LogIn size={24} /> Join Interview Room
              </button>
            </>
          )}
        </form>
        <p className="user-id-display">Your User ID: {firebaseUser?.uid || 'N/A'}</p>
      </div>
    );
  }

  // Display a connecting message until Stream client and call are ready
  if (!streamClient || !call) {
    return <div className="connecting-message">Connecting to Stream Call...</div>;
  }

  // Once Stream client and call are ready, render the video call UI
  return (
    <StreamVideo client={streamClient}>
      <StreamCall call={call}>
        <MyVideoCall currentCallId={roomCode} />
      </StreamCall>
    </StreamVideo>
  );
}

export default App;
