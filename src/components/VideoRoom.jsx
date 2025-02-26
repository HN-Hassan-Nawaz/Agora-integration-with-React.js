import React, { useEffect, useState } from "react";
import AgoraRTC from "agora-rtc-sdk-ng";

const APP_ID = import.meta.env.VITE_AGORA_APP_ID;
const TOKEN = import.meta.env.VITE_AGORA_TOKEN;
const CHANNEL = import.meta.env.VITE_AGORA_CHANNEL;

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

export const VideoRoom = ({ callerId, receiverId, leaveCall }) => {
  const [users, setUsers] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [joined, setJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Convert numeric IDs to strings to avoid Agora SDK warnings
  const callerUid = String(callerId);
  const receiverUid = String(receiverId);

  // Handle when a user joins the call
  const handleUserJoined = async (user, mediaType) => {
    console.log(`👤 User Joined: ${user.uid}, Media Type: ${mediaType}`);

    // Subscribe to the remote user
    await client.subscribe(user, mediaType);

    if (mediaType === "video") {
      // Add user to state if not already there
      setUsers((prevUsers) => {
        if (!prevUsers.some(u => u.uid === user.uid)) {
          return [...prevUsers, user];
        }
        return prevUsers;
      });

      // Play the video after a short delay to ensure DOM element exists
      setTimeout(() => {
        const container = document.getElementById(`video-container-${user.uid}`);
        if (container) {
          user.videoTrack.play(`video-container-${user.uid}`);
          console.log(`▶️ Playing video for user ${user.uid}`);
        } else {
          console.error(`❌ Container for user ${user.uid} not found`);
        }
      }, 1000);
    }

    if (mediaType === "audio") {
      user.audioTrack.play();
      console.log(`🔊 Playing audio for user ${user.uid}`);
    }
  };

  // Handle when a user leaves the call
  const handleUserLeft = (user) => {
    console.log(`🚪 User Left: ${user.uid}`);
    setUsers((prevUsers) => prevUsers.filter((u) => u.uid !== user.uid));
  };

  // Initialize local video and join the channel
  const initializeAgora = async () => {
    if (joined) return;

    try {
      console.log(`🚀 Joining Agora Channel: ${CHANNEL} as ${callerUid}`);

      // Join the channel (using uid as a string to prevent warnings)
      await client.join(APP_ID, CHANNEL, TOKEN, callerUid);
      console.log(`✅ Joined channel as ${callerUid}`);

      // Create camera and microphone tracks
      console.log("📷 Creating camera and microphone tracks");
      const [microphoneTrack, cameraTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        {}, // Default microphone config
        {
          encoderConfig: "standard",
          optimizationMode: "detail" // or "motion" for smoother video
        }
      );

      // Store tracks in state
      setLocalTracks([microphoneTrack, cameraTrack]);

      // Add local user to the users state
      setUsers(prevUsers => {
        const localUser = {
          uid: callerUid,
          videoTrack: cameraTrack,
          audioTrack: microphoneTrack
        };

        // Avoid duplicates
        if (!prevUsers.some(u => u.uid === callerUid)) {
          return [...prevUsers, localUser];
        }
        return prevUsers;
      });

      // Publish tracks to the channel
      console.log("📢 Publishing tracks to channel");
      await client.publish([microphoneTrack, cameraTrack]);

      // Play local video
      setTimeout(() => {
        const container = document.getElementById(`video-container-${callerUid}`);
        if (container && cameraTrack) {
          console.log(`▶️ Playing local video for ${callerUid}`);
          cameraTrack.play(`video-container-${callerUid}`);
        }
      }, 1000);

      setJoined(true);
      console.log("✅ Call initialization complete!");
    } catch (error) {
      console.error("❌ Error initializing Agora:", error);
      alert(`Failed to join call: ${error.message}`);
    }
  };

  // Toggle microphone mute/unmute
  const toggleMute = async () => {
    try {
      // Find the microphone track from localTracks
      const microphoneTrack = localTracks.find(track => track.trackMediaType === "audio");

      if (microphoneTrack) {
        if (isMuted) {
          // Unmute the microphone
          await microphoneTrack.setEnabled(true);
          console.log("🔊 Microphone unmuted");
        } else {
          // Mute the microphone
          await microphoneTrack.setEnabled(false);
          console.log("🔇 Microphone muted");
        }

        // Update mute state
        setIsMuted(!isMuted);
      } else {
        console.error("❌ Microphone track not found");
      }
    } catch (error) {
      console.error("❌ Error toggling mute:", error);
    }
  };

  // Start or join the call when component mounts or conditions change
  useEffect(() => {
    // Initialize Agora when component mounts
    console.log("🔄 Setting up call with", { callerUid, receiverUid });

    // Set up Agora event listeners
    client.on("user-published", handleUserJoined);
    client.on("user-left", handleUserLeft);

    // Detect call start from App.js
    const handleStorageChange = (event) => {
      if (event.key === "start-call") {
        const data = JSON.parse(event.newValue || "{}");
        const { receiverId: startReceiverId, callerId: startCallerId } = data;

        if ((startReceiverId === receiverId || startReceiverId === callerId ||
          startCallerId === callerId || startCallerId === receiverId) && !joined) {
          console.log("📱 Call start detected from storage event, initializing...");
          initializeAgora();
        }
      }
    };

    // Initialize immediately (assuming we're already in call mode)
    initializeAgora();

    // Listen for storage events (for cross-tab communication)
    window.addEventListener("storage", handleStorageChange);

    // Clean up on unmount
    return () => {
      window.removeEventListener("storage", handleStorageChange);

      // Leave the Agora channel
      if (joined) {
        console.log("🧹 Cleaning up Agora resources");

        // Close local tracks
        if (localTracks.length > 0) {
          localTracks.forEach(track => {
            if (track) {
              track.close();
              console.log(`🛑 Closed ${track.trackMediaType} track`);
            }
          });
        }

        // Leave the channel
        client.leave().then(() => {
          console.log("👋 Left Agora channel");
        }).catch(err => {
          console.error("❌ Error leaving channel:", err);
        });

        // Remove event listeners
        client.off("user-published", handleUserJoined);
        client.off("user-left", handleUserLeft);
      }
    };
  }, [callerId, receiverId]);

  // Handle the leave call button
  const handleLeaveCall = async () => {
    try {
      // Close local tracks
      if (localTracks.length > 0) {
        localTracks.forEach(track => {
          if (track) {
            track.close();
          }
        });
        setLocalTracks([]);
      }

      // Leave the Agora channel
      await client.leave();
      console.log("👋 Successfully left the call");

      // Callback to parent component
      leaveCall();
    } catch (error) {
      console.error("❌ Error leaving call:", error);
      // Still call the parent callback even if there's an error
      leaveCall();
    }
  };

  return (
    <div style={{ textAlign: "center" }}>
      <h2>Video Call with {receiverUid}</h2>

      <div style={{
        display: "grid",
        gridTemplateColumns: users.length > 1 ? "repeat(2, 1fr)" : "1fr",
        gap: "10px",
        maxWidth: "800px",
        margin: "0 auto"
      }}>
        {users.map((user) => (
          <div key={user.uid} style={{
            position: "relative",
            borderRadius: "8px",
            overflow: "hidden",
            backgroundColor: "#000",
            aspectRatio: "4/3",
          }}>
            {/* Video container */}
            <div
              id={`video-container-${user.uid}`}
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: "#1a1a1a"
              }}
            ></div>

            {/* User label */}
            <div style={{
              position: "absolute",
              bottom: "10px",
              left: "10px",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "#fff",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "14px"
            }}>
              {user.uid === callerUid ? "You" : `User ${user.uid}`}
            </div>

            {/* Show mute icon for local user if muted */}
            {user.uid === callerUid && isMuted && (
              <div style={{
                position: "absolute",
                top: "10px",
                left: "10px",
                backgroundColor: "rgba(255,0,0,0.6)",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "14px"
              }}>
                🔇 Muted
              </div>
            )}
          </div>
        ))}
      </div>

      {users.length === 0 && (
        <div style={{
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          margin: "20px 0"
        }}>
          <p>Connecting to call... Please wait.</p>
        </div>
      )}

      <div style={{ marginTop: "20px" }}>
        {/* Mute/Unmute Button */}
        <button
          onClick={toggleMute}
          style={{
            padding: "10px 20px",
            backgroundColor: isMuted ? "#28a745" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold",
            marginRight: "10px"
          }}
        >
          {isMuted ? "🔊 Unmute" : "🔇 Mute"}
        </button>

        {/* Leave Call Button */}
        <button
          onClick={handleLeaveCall}
          style={{
            padding: "10px 20px",
            backgroundColor: "#d9534f",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: "pointer",
            fontWeight: "bold"
          }}
        >
          Leave Call
        </button>
      </div>
    </div>
  );
};