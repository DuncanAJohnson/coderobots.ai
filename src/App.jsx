import { useRef, useEffect } from 'react'
import './App.css'
import SPIKEEditor from './components/SPIKEEditor'

function App() {
  const resizerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const resizer = resizerRef.current;
    const container = containerRef.current;
    if (!resizer || !container) return;

    let isDragging = false;

    const handleMouseDown = (e) => {
      e.preventDefault();
      isDragging = true;
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    };

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const percent = (offsetX / rect.width) * 100;
      
      // Constrain between 20% and 80%
      const constrainedPercent = Math.min(Math.max(percent, 20), 80);
      container.style.gridTemplateColumns = `${constrainedPercent}% 5px auto`;
    };

    const handleMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    resizer.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      resizer.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div className="app-container">
      <div className="title-bar">
        {/* Space for title bar */}
      </div>
      <div className="main-content" ref={containerRef}>
        <div className="left-panel">
          <SPIKEEditor />
        </div>
        <div className="horizontal-resizer" ref={resizerRef}></div>
        <div className="right-panel">
          {/* Space for chat component */}
        </div>
      </div>
    </div>
  )
}

export default App
