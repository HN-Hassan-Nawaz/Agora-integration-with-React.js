import { useState, useEffect, useRef } from "react";
import "../App.css";
import { VideoRoom } from "./VideoRoom";

function CallStartup() {
    const [joined, setJoined] = useState(false);
    const receiverIdRef = useRef("");
    const [callerId] = useState(Math.floor(Math.random() * 1000000).toString());
    const [incomingCall, setIncomingCall] = useState(null);
    const [isRinging, setIsRinging] = useState(false);
    const [connectedUser, setConnectedUser] = useState(null);

    console.log("Current User ID:", callerId);

    useEffect(() => {
        const handleStorageEvent = (event) => {
            if (event.key === "call-request") {
                const { senderId, targetId } = JSON.parse(event.newValue);
                if (targetId === callerId && !incomingCall && !joined) {
                    console.log("📥 Received Call Request:", senderId);
                    setIncomingCall(senderId);
                    setIsRinging(true);
                }
            } else if (event.key === "start-call") {
                const { receiverId, callerId: acceptedCallerId } = JSON.parse(event.newValue);
                if (receiverId === callerId || acceptedCallerId === callerId) {
                    console.log("📞 Call Started");
                    setJoined(true);
                    setIsRinging(false);
                    setIncomingCall(null);
                    setConnectedUser(receiverId === callerId ? acceptedCallerId : receiverId);
                }
            }
        };

        window.addEventListener("storage", handleStorageEvent);
        return () => window.removeEventListener("storage", handleStorageEvent);
    }, [callerId, incomingCall, joined]);

    const sendCallRequest = () => {
        const targetId = receiverIdRef.current.trim();

        if (!targetId) {
            alert("Please enter a valid User ID.");
            return;
        }

        console.log(`📡 Sending Call Request: From ${callerId} → To ${targetId}`);
        localStorage.setItem("call-request", JSON.stringify({ senderId: callerId, targetId, timestamp: Date.now() }));
    };

    const acceptCall = () => {
        console.log("📞 Call Accepted. Joining Video Room...");
        localStorage.setItem("start-call", JSON.stringify({ receiverId: callerId, callerId: incomingCall, timestamp: Date.now() }));
        setJoined(true);
        setIsRinging(false);
        setIncomingCall(null);
        setConnectedUser(incomingCall);
    };

    const rejectCall = () => {
        console.log("❌ Call Rejected");
        setIncomingCall(null);
        setIsRinging(false);
    };

    return (
        <div className="App">
            <h1>WDJ Virtual Call</h1>

            {!joined && !incomingCall && (
                <div>
                    <p>Your ID: <strong>{callerId}</strong></p>
                    <input
                        type="text"
                        placeholder="Enter User ID to Call"
                        defaultValue={receiverIdRef.current}
                        onChange={(e) => (receiverIdRef.current = e.target.value)}
                    />
                    <button onClick={sendCallRequest}>Call</button>
                </div>
            )}

            {!joined && incomingCall && (
                <div>
                    <p>📞 Incoming Call from <strong>{incomingCall}</strong></p>
                    {isRinging && <p>🔔 Ringing...</p>}
                    <button onClick={acceptCall}>Accept</button>
                    <button onClick={rejectCall}>Reject</button>
                </div>
            )}

            {joined && connectedUser && (
                <VideoRoom
                    callerId={callerId}
                    receiverId={connectedUser}
                    leaveCall={() => {
                        setJoined(false);
                        setIncomingCall(null);
                        setConnectedUser(null);
                    }}
                />
            )}
        </div>
    );
}

export default CallStartup;