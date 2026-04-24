import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  FaBeer, FaBoxes, FaWineBottle, FaCashRegister, FaTruck, FaFlask,
  FaWrench, FaCalendarAlt, FaCrown, FaChartLine, FaShower, FaHandshake,
  FaRobot, FaBrain, FaUtensils, FaChartBar, FaSearchPlus, FaTag, FaBullhorn,
} from 'react-icons/fa';
import { GiBarrel, GiWheat, GiThermometerScale } from 'react-icons/gi';
import { getAll } from '../services/api';

const operationsCards = [
  { name: 'Brew Log', desc: 'Recipe & batch tracking', icon: FaBeer, route: 'brew-logs' },
  { name: 'Tank Management', desc: 'Tank scheduling & status', icon: GiBarrel, route: 'tanks' },
  { name: 'Raw Materials', desc: 'Inventory management', icon: GiWheat, route: 'raw-materials' },
  { name: 'Fermentation', desc: 'Monitoring & logging', icon: GiThermometerScale, route: 'fermentation-logs' },
  { name: 'Packaging', desc: 'Cans, bottles & kegs', icon: FaBoxes, route: 'packaging-runs' },
  { name: 'Keg Tracking', desc: 'Fill, tap & track', icon: FaWineBottle, route: 'kegs' },
  { name: 'Taproom POS', desc: 'Point of sale', icon: FaCashRegister, route: 'pos-transactions' },
  { name: 'Distribution', desc: 'Wholesaler management', icon: FaTruck, route: 'distributions' },
  { name: 'Lab Results', desc: 'QC testing & analysis', icon: FaFlask, route: 'lab-results' },
  { name: 'Equipment', desc: 'Maintenance tracking', icon: FaWrench, route: 'equipment' },
  { name: 'Events', desc: 'Booking & management', icon: FaCalendarAlt, route: 'events' },
  { name: 'Loyalty Program', desc: 'Mug club & rewards', icon: FaCrown, route: 'loyalty-members' },
  { name: 'Financial Records', desc: 'Revenue & expenses', icon: FaChartLine, route: 'financial-records' },
  { name: 'CIP Schedules', desc: 'Clean-in-place', icon: FaShower, route: 'cip-schedules' },
  { name: 'Vendors', desc: 'Supplier management', icon: FaHandshake, route: 'vendors' },
];

const aiCards = [
  { name: 'Recipe Formulation AI', desc: 'AI-powered recipe suggestions', icon: FaBrain, route: 'recipe-suggestion' },
  { name: 'Tasting Notes AI', desc: 'Generate professional tasting notes', icon: FaBeer, route: 'tasting-notes' },
  { name: 'Food Pairing AI', desc: 'AI food pairing recommendations', icon: FaUtensils, route: 'food-pairing' },
  { name: 'Demand Forecast AI', desc: 'SKU demand forecasting', icon: FaChartBar, route: 'demand-forecast' },
  { name: 'Quality Analysis AI', desc: 'Root cause analysis', icon: FaSearchPlus, route: 'quality-analysis' },
  { name: 'Label Copy AI', desc: 'Generate label copy text', icon: FaTag, route: 'label-copy' },
  { name: 'Event Content AI', desc: 'Marketing content generation', icon: FaBullhorn, route: 'event-content' },
];

function Dashboard() {
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchCounts = async () => {
      const features = operationsCards.map((c) => c.route);
      const results = await Promise.allSettled(
        features.map((f) => getAll(f))
      );
      const newCounts = {};
      results.forEach((result, i) => {
        if (result.status === 'fulfilled') {
          const data = result.value.data;
          newCounts[features[i]] = Array.isArray(data)
            ? data.length
            : data?.data
            ? data.data.length
            : 0;
        } else {
          newCounts[features[i]] = 0;
        }
      });
      setCounts(newCounts);
    };
    fetchCounts();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.info('Logged out successfully');
    navigate('/');
  };

  const totalItems = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div>
      <div className="dashboard-header">
        <div className="dashboard-brand">
          <span className="brand-icon">&#127866;</span>
          <h1>BrewOps AI</h1>
        </div>
        <div className="dashboard-user">
          <span>{user.email || 'Admin'}</span>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>

      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-icon">&#128202;</span>
          <div className="stat-info">
            <div className="stat-value">{totalItems}</div>
            <div className="stat-label">Total Records</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">&#127866;</span>
          <div className="stat-info">
            <div className="stat-value">{counts['brew-logs'] || 0}</div>
            <div className="stat-label">Brew Logs</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">&#129380;</span>
          <div className="stat-info">
            <div className="stat-value">{counts['tanks'] || 0}</div>
            <div className="stat-label">Active Tanks</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">&#128176;</span>
          <div className="stat-info">
            <div className="stat-value">{counts['pos-transactions'] || 0}</div>
            <div className="stat-label">Transactions</div>
          </div>
        </div>
        <div className="stat-item">
          <span className="stat-icon">&#129302;</span>
          <div className="stat-info">
            <div className="stat-value">7</div>
            <div className="stat-label">AI Tools</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <div className="section-title">
            Operations
            <span className="section-line"></span>
          </div>
          <div className="card-grid">
            {operationsCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.route}
                  className="card feature-card"
                  onClick={() => navigate(`/feature/${card.route}`)}
                >
                  <div className="card-icon">
                    <Icon />
                  </div>
                  <div className="card-title">{card.name}</div>
                  <div className="card-desc">{card.desc}</div>
                  <div className="card-count">
                    {counts[card.route] !== undefined
                      ? `${counts[card.route]} records`
                      : 'Loading...'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-title">
            <FaRobot style={{ color: 'var(--accent-gold)' }} />
            AI Tools
            <span className="section-line"></span>
          </div>
          <div className="card-grid">
            {aiCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.route}
                  className="card feature-card"
                  onClick={() => navigate(`/ai/${card.route}`)}
                >
                  <div className="card-icon">
                    <Icon />
                  </div>
                  <div className="card-title">{card.name}</div>
                  <div className="card-desc">{card.desc}</div>
                  <div className="card-count" style={{ color: 'var(--info)' }}>
                    AI Powered
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
