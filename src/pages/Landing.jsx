import React, { useEffect } from 'react';
import '../LandingPage.css';

const Landing = () => {
  useEffect(() => {
    // Smooth scrolling for nav links
    const handleSmoothScroll = (e) => {
      if (e.target.tagName === 'A' && e.target.getAttribute('href')?.startsWith('#')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        const yOffset = -80; // Adjust for fixed header
        
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop + yOffset,
            behavior: 'smooth'
          });
        }
      }
    };

    document.addEventListener('click', handleSmoothScroll);
    
    return () => {
      document.removeEventListener('click', handleSmoothScroll);
    };
  }, []);

  const handleNavigation = (path) => {
    window.location.href = path;
  };

  return (
    <div className="landing-page">
      {/* Navigation Bar */}
      <nav>
        <div className="logo"><span className="gradient">Event-ually Perfect</span></div>
        <div className="nav-links">
          <a href="#services">Services</a>
          <a href="#about">About</a>
          <button className="nav-button" onClick={() => handleNavigation('signup.html')}>Sign Up</button>
          <button className="nav-button" onClick={() => handleNavigation('login.html')}>Login</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Event-ually <span className="gradient">Perfect</span></h1>
          <p>We give you all the tools needed to create unforgettable experiences tailored to your vision. From intimate gatherings to grand celebrations, we handle every detail so you can enjoy the moment.</p>
          <button className="hero-button" onClick={() => handleNavigation('SignUp.jsx')}>Get Started</button>
        </div>
      </section>

      {/* Services Section */}
      <section className="content-section services" id="services">
        <div className="section-container">
          <h2 className="section-smallTitle">Our Services</h2>
          <h3 className="gradient-text">We are here to help you</h3>
          <p className="section-text">We offer a wide range of services to make your event planning experience hassle-free and stress-free.</p>
          
          <div className="value-grid">
            <div className="my-block">
              <i className="fas fa-users"></i>
              <h3 className="block-title">Guest Management</h3>
              <p className="block-text">Track RSVPs, dietary needs, and seating in one place.</p>
            </div>
            <div className="my-block">
              <i className="fas fa-utensils"></i>
              <h3 className="block-title">Vendor Coordination</h3>
              <p className="block-text">Compare and book caterers, venues, and more.</p>
            </div>
            <div className="my-block">
              <i className="fas fa-map-marked-alt"></i>
              <h3 className="block-title">Event Blueprints</h3>
              <p className="block-text">Design floorplans and schedules with drag-and-drop.</p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="content-section about" id="about">
        <div className="section-container">
          <h2 className="gradient-text">Why We Do It</h2>
          
          <div className="about-content">
            <p className="section-text highlight-first">
              At <strong>Event-ually Perfect</strong>, we believe every celebration should be as unique as the people it honors. 
              Your events aren't just dates on a calendar—they're the milestones that define your story.
            </p>
            
            <div className="about-features">
              <div className="feature-block">
                <i className="fas fa-palette feature-icon"></i>
                <h3 className="feature-title">Custom Design</h3>
                <p>Themes that reflect your personality</p>
              </div>
              
              <div className="feature-block">
                <i className="fas fa-clock feature-icon"></i>
                <h3 className="feature-title">Seamless Execution</h3>
                <p>Precision coordination so you can be present</p>
              </div>
              
              <div className="feature-block">
                <i className="fas fa-heart feature-icon"></i>
                <h3 className="feature-title">Thoughtful Details</h3>
                <p>From signature cocktails to custom timelines</p>
              </div>
            </div>
            
            <div className="mission-statement">
              <p className="section-text">
                Because your wedding should taste like childhood memories. Because your gala should spark 
                the same excitement as your first success. We don't just plan events—we design experiences 
                that disappear into the background, leaving only the joy of connection.
              </p>
              <button className="hero-button" onClick={() => handleNavigation('Sign')}>Let's Create Together</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;