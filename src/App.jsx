import React from 'react';
import Home from './pages/Home';




function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Agora Integration with React.js for Video Calling</h1>
        <div>
          <h2>Important Note</h2>
          <p>when someone use that code then make sure to change the .env file and update there components such as <br /> "
            <strong>
              1) VITE_AGORA_TOKEN <br />
              2) VITE_AGORA_APP_ID <br />
              3) VITE_AGORA_CHANNEL" <br />
            </strong>
            then run the project and make video call Successfully</p>
        </div>
        <Home />
      </header>
    </div>
  );
}

export default App;