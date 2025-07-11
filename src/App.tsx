// src/App.tsx

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  StreamVideoClient,
  StreamVideo,
  Call, // Type definition for the call object
  StreamCall, // React component for rendering the call context
  useCall,
  ParticipantView, // Import ParticipantView to render individual participant videos
  type User as StreamUserType, // MODIFIED: Added 'type' keyword to resolve TypeScript error
} from '@stream-io/video-react-sdk';

// Import Lucide React icons
import { Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff, PhoneOff, MessageSquare, CircleDot, LogIn, PlusCircle, UserCheck, Code } from 'lucide-react';

// Import Monaco Editor
import Editor from '@monaco-editor/react';

// Import Stream styles (still needed for Stream's base components)
import '@stream-io/video-react-sdk/dist/css/styles.css';
import './App.css'; // Your custom CSS

// Firebase imports
import { initializeApp } from 'firebase/app';
// MODIFIED: Import specific Firebase Auth functions for email/password and Google
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
// NEW: Import the entire 'firebase/auth' module as 'firebaseAuth' to access User type
import * as firebaseAuth from 'firebase/auth'; // Import as namespace
import { getFirestore, doc, setDoc, getDoc, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';

// --- TEMPORARY:      HARDCODED FIREBASE CONFIGURATION FOR LOCAL DEBUGGING ---
// IMPORTANT: This is a temporary measure to get your app running locally
// because the __firebase_config from the Canvas environment is not being injected correctly.
// In a production deployment, you MUST REMOVE this hardcoded config and rely
// on the __firebase_config variable provided by the Canvas environment for security.
const localFirebaseConfig = {
  apiKey: "AIzaSyCGrPN42ebEljSXZyVlxddXajB0kn8rCyA",
  authDomain: "video-interview-platform-app.firebaseapp.com",
  projectId: "video-interview-platform-app",
  storageBucket: "video-interview-platform-app.firebasestorage.app",
  messagingSenderId: "884330578336",
  appId: "1:884330578336:web:1cf05b259a061c9b1e24c5",
  measurementId: "G-M4V2Z8MCM5"
};

// Use the hardcoded config for local development
const firebaseConfig = localFirebaseConfig;
console.log("Firebase Config at runtime (using local config):", firebaseConfig); // ADDED: Console log for debugging

// Use your Firebase Project ID directly for Firestore paths for now
// In a production Canvas environment, __app_id would be used here.
const canvasAppId = "video-interview-platform-app"; // Using your actual project ID directly

// Initialize Firebase App and Services
const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp); // Export auth for use in this file and potentially others
export const db = getFirestore(firebaseApp); // Export db for Firestore operations

// --- Your actual Stream API Key (PUBLIC, OK to be here) ---
const apiKey = '2raj8ju2bgdw';

// --- IMPORTANT: REMOVED STREAM API SECRET FROM CLIENT-SIDE CODE ---
// The streamApiSecret is now ONLY on the backend.

// REMOVED: The incomplete `generateStreamUserToken` helper function is removed as it's not needed
// and was causing a syntax error. Token generation will be handled by the backend (Step 2).

// -------------------------------------------------------------------------------
// Helper function to generate a unique room ID
const generateRoomId = () => Math.random().toString(36).substring(2, 8).toUpperCase();

// -------------------------------------------------------------------------------
// 2. Component to display the video call
function MyVideoCall({ currentCallId }: { currentCallId: string }) {
  const call = useCall(); // Get the current call object from context
  const participants = call?.state.participants || [];
  const editorRef = useRef<any>(null); // Ref to hold the Monaco editor instance
  const isLocalChangeRef = useRef(false); // New ref to track local changes

  // State for local media controls
  const [isMicrophoneEnabled, setIsMicrophoneEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showEditor, setShowEditor] = useState(false); // State to toggle editor visibility
  const [editorLanguage, setEditorLanguage] = useState<string>('cpp'); // New state for editor language
  const [editorContent, setEditorContent] = useState<string>('// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}'); // State for editor content

  // Firestore document references for the editor content and language
  // MODIFIED: Use canvasAppId for Firestore paths
  const editorContentDocRef = doc(db, `artifacts/${canvasAppId}/public/data/interviewRooms/${currentCallId}/editorContent`, 'currentEditor');
  const editorLanguageDocRef = doc(db, `artifacts/${canvasAppId}/public/data/interviewRooms/${currentCallId}/editorLanguage`, 'currentLanguage');

  // Initial content for different languages
  const initialCodeContent: { [key: string]: string } = {
    cpp: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}',
    python: '# Write your Python code here\ndef greet(name):\n    print(f"Hello, {name}!")\n\ngreet("World")'
  };

  // Effect to listen for real-time editor content and language updates from Firestore
  useEffect(() => {
    if (!currentCallId) return;

    // Listen for editor content changes
    const unsubscribeContent = onSnapshot(editorContentDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // IMPORTANT FIX: Only update if the change is NOT from the current local user
        // and the incoming data is different from current editor content.
        if (data && data.code !== undefined && !isLocalChangeRef.current && editorRef.current && data.code !== editorRef.current.getValue()) {
          console.log("Firestore content update received (external):", data.code); // Debugging
          setEditorContent(data.code); // Update React state
          editorRef.current.setValue(data.code); // Update Monaco directly for immediate visual sync
        }
      } else {
        // If content doc doesn't exist, create it with initial content for current language
        console.log("Initializing editor content in Firestore."); // Debugging
        setDoc(editorContentDocRef, { code: initialCodeContent[editorLanguage], createdAt: new Date() })
          .catch(error => console.error("Error initializing editor content:", error));
      }
    }, (error) => {
      console.error("Error listening to editor content:", error);
    });

    // Listen for editor language changes
    const unsubscribeLanguage = onSnapshot(editorLanguageDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && data.language !== undefined && data.language !== editorLanguage) {
          console.log("Firestore language update received:", data.language); // Debugging
          setEditorLanguage(data.language);
          // When language changes from Firestore, also update content to boilerplate
          const newContent = initialCodeContent[data.language] || initialCodeContent['cpp']; // Fallback to cpp
          setEditorContent(newContent);
          if (editorRef.current) {
            editorRef.current.setValue(newContent);
          }
        }
      } else {
        // If language doc doesn't exist, create it with initial language
        console.log("Initializing editor language in Firestore."); // Debugging
        setDoc(editorLanguageDocRef, { language: editorLanguage, createdAt: new Date() })
          .catch(error => console.error("Error initializing editor language:", error));
      }
    }, (error) => {
      console.error("Error listening to editor language:", error);
    });


    return () => {
      unsubscribeContent(); // Cleanup content listener
      unsubscribeLanguage(); // Cleanup language listener
    };
  }, [currentCallId, editorLanguage, editorContentDocRef, editorLanguageDocRef]); // Removed editorContent from dependencies to prevent re-triggering on local changes

  // Debounce mechanism for writing editor content to Firestore
  const debounceTimeout = useRef<NodeJS.Timeout | null>(null);

  const updateFirestoreEditorContent = useCallback((code: string) => {
    if (debounceTimeout.current) {
      clearTimeout(debounceTimeout.current);
    }
    debounceTimeout.current = setTimeout(() => {
      console.log("Attempting to write to Firestore (debounced):", code); // Debugging
      setDoc(editorContentDocRef, { code: code, lastUpdated: new Date() }, { merge: true })
        .then(() => {
          console.log("Firestore write successful."); // Debugging
          isLocalChangeRef.current = false; // Reset flag after successful write
        })
        .catch(error => {
          console.error("Error updating editor content to Firestore:", error); // More specific error
          isLocalChangeRef.current = false; // Reset flag even on error
        });
    }, 500); // Debounce for 500ms
  }, [editorContentDocRef]); // Dependency on editorContentDocRef

  // Handler for editor content changes
  const handleEditorChange = (value: string | undefined) => {
    console.log("Editor onChange triggered. New value:", value); // Debugging
    if (value !== undefined) {
      isLocalChangeRef.current = true; // Set flag: this is a local change
      setEditorContent(value); // Update React state immediately
      updateFirestoreEditorContent(value); // Trigger debounced Firestore write
    }
  };

  // Handler for Monaco editor mount
  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    // Set initial value from state (which is synced from Firestore)
    editorRef.current.setValue(editorContent);
    console.log("Monaco Editor mounted."); // Debugging
  };

  // Function to change editor language and update Firestore
  const changeEditorLanguage = async (lang: string) => {
    console.log("Changing editor language to:", lang); // Debugging
    setEditorLanguage(lang);
    // Update Firestore with the new language
    try {
      await setDoc(editorLanguageDocRef, { language: lang, lastUpdated: new Date() }, { merge: true });
      console.log("Firestore language update successful."); // Debugging
    } catch (error) {
      console.error("Error updating editor language in Firestore:", error);
    }
    // Update initial content based on language locally and in editor
    const newContent = initialCodeContent[lang] || initialCodeContent['cpp']; // Fallback to cpp
    setEditorContent(newContent);
    if (editorRef.current) {
      editorRef.current.setValue(newContent);
    }
    // Also update content in Firestore to match boilerplate of new language
    try {
      await setDoc(editorContentDocRef, { code: newContent, lastUpdated: new Date() }, { merge: true });
      console.log("Firestore content update for new language successful."); // Debugging
    } catch (error) {
      console.error("Error updating editor content for new language in Firestore:", error);
    }
  };


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

      {/* Main content area: Video Grid and optional Editor */}
      <div className={`main-call-content ${showEditor ? 'editor-active' : ''}`}>
        {/* Video Grid */}
        <div className="video-grid-container">
          {participants.length > 0 ? (
            participants.map((p) => (
              <div key={p.sessionId} className="participant-video-wrapper">
                <ParticipantView participant={p} />
                <div className="participant-name">
                  {p.name || p.userId}
                </div>
              </div>
            ))
          ) : (
            <div className="waiting-message">Waiting for participants...</div>
          )}
        </div>

        {/* Code Editor */}
        {showEditor && (
          <div className="code-editor-container">
            <div className="language-selector-bar">
                <button onClick={() => changeEditorLanguage('cpp')} className={`lang-button ${editorLanguage === 'cpp' ? 'active' : ''}`}>
                    C++
                </button>
                <button onClick={() => changeEditorLanguage('python')} className={`lang-button ${editorLanguage === 'python' ? 'active' : ''}`}>
                    Python
                </button>
            </div>
            <Editor
              height="calc(100% - 40px)" // Adjust height for language selector bar
              language={editorLanguage} // Dynamic language prop
              value={editorContent} // Controlled component value
              onChange={handleEditorChange}
              onMount={handleEditorDidMount}
              theme="vs-dark" // Dark theme for the editor
              options={{
                minimap: { enabled: false }, // Disable minimap for cleaner look
                fontSize: 16,
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true, // Adjusts layout on container resize
                readOnly: false, // Explicitly ensure editor is not read-only
              }}
            />
          </div>
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

        {/* Code Editor Toggle Button */}
        <button
          onClick={() => setShowEditor(!showEditor)}
          className={`control-button code-editor-toggle-button ${showEditor ? 'active' : ''}`}
          title={showEditor ? "Hide Code Editor" : "Show Code Editor"}
        >
          <Code size={28} />
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
// 3. Main Application Component (App)
function App() {
  // MODIFIED: State for Firebase user and authentication readiness
  const [currentUser, setCurrentUser] = useState<firebaseAuth.User | null>(null); // MODIFIED: Use firebaseAuth.User
  const [loadingAuth, setLoadingAuth] = useState(true); // True while Firebase Auth is checking session
  const [email, setEmail] = useState(''); // State for email input field
  const [password, setPassword] = useState(''); // State for password input field
  const [authError, setAuthError] = useState<string | null>(null); // State for displaying auth errors


  // State for Stream client and call
  const [streamClient, setStreamClient] = useState<StreamVideoClient | undefined>(undefined);
  const [call, setCall] = useState<Call | undefined>(undefined);

  // State for lobby/room management
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<'interviewer' | 'candidate' | ''>('');
  const [roomCode, setRoomCode] = useState('');
  const [showCall, setShowCall] = useState(false); // Controls showing video call UI

  // NEW: Firebase Authentication Logic Functions
  const handleSignUp = async () => {
    setAuthError(null); // Clear any previous authentication errors
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // User automatically logged in after sign up
    } catch (error: any) {
      console.error("Error signing up:", error.message);
      setAuthError(error.message); // Display the error message to the user
    }
  };

  const handleSignIn = async () => {
    setAuthError(null); // Clear any previous authentication errors
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User logged in
    } catch (error: any) {
      console.error("Error signing in:", error.message);
      setAuthError(error.message); // Display the error message to the user
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null); // Clear any previous authentication errors
    try {
      const provider = new GoogleAuthProvider(); // Create a new Google Auth provider instance
      await signInWithPopup(auth, provider); // Trigger the Google sign-in pop-up
      // User logged in with Google
    } catch (error: any) {
      console.error("Error signing in with Google:", error.message);
      setAuthError(error.message); // Display the error message to the user
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth); // Sign out the current user
      // User logged out. onAuthStateChanged will update currentUser to null.
      // Also reset Stream client and call states
      setStreamClient(undefined);
      setCall(undefined);
      setShowCall(false); // Go back to lobby/login screen
      setUsername(''); // Clear username
      setRole(''); // Clear role
      setRoomCode(''); // Clear room code
    } catch (error: any) {
      console.error("Error signing out:", error.message);
      setAuthError(error.message); // Display the error message to the user
    }
  };

  // --- MODIFIED: Firebase Authentication Effect ---
  // This effect sets up the Firebase Authentication state listener.
  // It runs once on component mount to determine if a user is already logged in.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user); // Update the currentUser state with the Firebase User object
      setLoadingAuth(false); // Authentication check is complete, UI can now render based on user state

      // REMOVED: signInAnonymously(auth); - We are now using explicit login/signup.
      // Anonymous sign-in is no longer the default behavior.
    });

    // Cleanup the subscription when the component unmounts to prevent memory leaks
    return () => unsubscribe();
  }, []); // Empty dependency array means this effect runs only once on mount

  // --- MODIFIED: Stream Client and Call Setup Effect ---
  // This effect now depends on `currentUser` being available (i.e., a user is logged in).
  // It initializes the Stream.io client and joins the call only when all conditions are met.
  useEffect(() => {
    // Only proceed if:
    // 1. Authentication check is complete (`!loadingAuth`)
    // 2. A user is logged in (`currentUser`)
    // 3. The app intends to show the call UI (`showCall`)
    // 4. Username and Room Code are provided (from the lobby form)
    if (!loadingAuth && currentUser && showCall && username && roomCode) {
      const setupStream = async () => {
        const streamUserId = currentUser.uid; // Use the authenticated Firebase UID for Stream.io

        let currentStreamUserToken: string;
        try {
          // MODIFIED: Fetch Stream token from your backend service
          const response = await fetch('http://localhost:5000/generate_stream_token', { // Replace with your backend URL
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId: streamUserId }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Failed to fetch Stream token: ${errorData.error || response.statusText}`);
          }

          const data = await response.json();
          currentStreamUserToken = data.token;

        } catch (tokenError: any) {
          console.error('Error generating Stream token:', tokenError);
          alert(`Failed to generate Stream token. Please ensure your backend is running at http://localhost:5000 and check console for details. Error: ${tokenError.message}`);
          setShowCall(false); // Go back to lobby on token generation failure
          setStreamClient(undefined); // Clear client on failure
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
          token: currentStreamUserToken, // Use the dynamically obtained token from backend
        });
        setStreamClient(clientInstance);

        // Create and join the call
        const newCall = clientInstance.call('default', roomCode);
        newCall.join({ create: true })
          .then(() => setCall(newCall))
          .catch(error => {
            console.error('Failed to join call:', error);
            // Use a custom message box instead of alert() for better UX in Canvas
            // For now, keeping alert() as per previous code, but recommend replacing.
            alert('Failed to join call. Please check the room code and try again.');
            setShowCall(false); // Go back to lobby on join failure
            setStreamClient(undefined); // Clear client on failure
          });
      };

      setupStream();

      return () => {
        // Cleanup function for this effect
        if (call) {
          call.leave().catch(console.error);
        }
        // Also disconnect client on unmount or when conditions are no longer met
        if (streamClient) {
            streamClient.disconnectUser();
            setStreamClient(undefined);
        }
      };
    }
  }, [loadingAuth, currentUser, showCall, username, roomCode]); // Dependencies for this effect

  // --- Lobby Functions (MODIFIED to depend on currentUser) ---
  // The `handleLogin` function (which was an onSubmit for the form) is REMOVED
  // because the specific authentication buttons (Sign Up, Log In, Google Sign In)
  // now handle the form submission logic. The username and role are still collected
  // in the lobby UI, but their submission is tied to create/join room actions.

  const handleCreateRoom = async () => {
    if (!currentUser) { // MODIFIED: Check for currentUser instead of firebaseUser
      alert('You must be logged in to create a room.');
      return;
    }
    if (!username || !role) { // NEW: Ensure username and role are selected
        alert('Please enter your name and select a role.');
        return;
    }
    const newRoomId = generateRoomId();
    try {
      // Store room details in Firestore
      // MODIFIED: Use canvasAppId for Firestore path
      await setDoc(doc(db, `artifacts/${canvasAppId}/public/data/interviewRooms`, newRoomId), {
        roomId: newRoomId,
        interviewerId: currentUser.uid, // MODIFIED: Use currentUser.uid
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
    if (!currentUser) { // MODIFIED: Check for currentUser instead of firebaseUser
      alert('You must be logged in to join a room.');
      return;
    }
    if (!roomCode || !username || !role) { // MODIFIED: Ensure roomCode, username, and role are filled
      alert('Please enter a room code, your name, and select a role to join.');
      return;
    }
    try {
      // Check if room exists in Firestore
      // MODIFIED: Use canvasAppId for Firestore path
      const roomDoc = await getDoc(doc(db, `artifacts/${canvasAppId}/public/data/interviewRooms`, roomCode));
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

  // --- MODIFIED: Conditional Rendering ---
  // The main return block now handles three distinct states:
  // 1. Authenticating (initial load)
  // 2. Not logged in (show login/signup form)
  // 3. Logged in, but not in a call (show lobby form to create/join room)
  // 4. Logged in AND in a call (show video call UI)

  // 1. Show loading message while Firebase Auth state is being determined
  if (loadingAuth) {
    return <div className="connecting-message">Authenticating...</div>;
  }

  // 2. If no user is logged in, show the login/signup form
  if (!currentUser) {
    return (
      <div className="lobby-container">
        <h1 className="lobby-title">Welcome to the Interview Call!</h1>
        <div className="form-card">
          <h2>Sign Up or Log In</h2>
          {authError && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{authError}</p>}
          <div className="form-group">
            <label htmlFor="email" className="form-label">Email:</label>
            <input
              type="email"
              id="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="password" className="form-label">Password:</label>
            <input
              type="password"
              id="password"
              className="form-input"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="action-button create-room-button" onClick={handleSignUp}>
            Sign Up
          </button>
          <button className="action-button join-room-button" onClick={handleSignIn}>
            Log In
          </button>
          <button className="action-button join-room-button" onClick={handleGoogleSignIn} style={{ backgroundColor: '#DB4437' }}>
            Sign In with Google
          </button>
        </div>
      </div>
    );
  }

  // 3. If a user IS logged in, but not yet in a call, show the lobby UI
  if (!showCall) {
    return (
      <div className="lobby-container">
        <h1 className="lobby-title">Interview Platform</h1>
        <form className="form-card"> {/* Removed onSubmit as buttons handle submission */}
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
        {/* MODIFIED: Display authenticated user's email/UID */}
        <p className="user-id-display">Logged in as: {currentUser.email || currentUser.uid}</p>
        {/* NEW: Sign Out button in the lobby */}
        <button className="action-button leave-button" onClick={handleSignOut} style={{ marginTop: '20px' }}>
            Sign Out
        </button>
      </div>
    );
  }

  // 4. Display a connecting message until Stream client and call are ready
  if (!streamClient || !call) {
    return <div className="connecting-message">Connecting to Stream Call...</div>;
  }

  // 5. Once Stream client and call are ready, render the video call UI
  return (
    <StreamVideo client={streamClient}>
      <StreamCall call={call}>
        <MyVideoCall currentCallId={roomCode} />
      </StreamCall>
    </StreamVideo>
  );
}

export default App;
