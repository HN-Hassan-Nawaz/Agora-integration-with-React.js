import React, { useEffect, useRef } from "react";

export const VideoPlayer = ({ user }) => {
  const videoRef = useRef();

  useEffect(() => {
    setTimeout(() => {
      if (user.videoTrack) {
        user.videoTrack.play(videoRef.current);
      }
      if (user.audioTrack) {
        user.audioTrack.play();
      }
    }, 500);
  }, [user]);

  return (
    <div>
      <p>Uid: {user.uid}</p>
      <div ref={videoRef} style={{ width: "200px", height: "200px", backgroundColor: "black" }}></div>
    </div>
  );
};
