import React, { useState, useEffect, useCallback } from 'react';
import { fetchCurrentPriceAction, checkApiConfigAction, placeMarketOrderAction } from '@/actions/hyperliquid-actions';

const TradingForm = ({ initialPrice, onTradeSubmit }) => {
  // Form state
  const [size, setSize] = useState('0.01');
  const [leverage, setLeverage] = useState('10');
  const [direction, setDirection] = useState('LONG');
  const [template, setTemplate] = useState('None');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(initialPrice || '');
  const [formValid, setFormValid] = useState(true); // Initialize as true since we have default values

  // Derived values
  const [requiredMargin, setRequiredMargin] = useState('0');
  const [liquidationPrice, setLiquidationPrice] = useState('0');

  // CRITICAL FIX: Debug to check if button is disabled when it shouldn't be
  useEffect(() => {
    // Add this debug logging to help identify button issues
    const reviewButton = document.querySelector('button.review-button');
    if (reviewButton) {
      console.log('DEBUG: Review button state:', {
        disabled: reviewButton.disabled,
        formValid,
        size,
        hasOnClick: !!reviewButton.onclick,
        buttonText: reviewButton.innerText
      });

      // Force button to be enabled with default values
      if (size && parseFloat(size) > 0) {
        reviewButton.disabled = false;
        console.log('DEBUG: Forcing button to be enabled');
      }
    } else {
      console.log('DEBUG: Review button not found in DOM');
    }
  }, [size, formValid]);

  // Calculate values whenever inputs change
  const calculateValues = useCallback(() => {
    try {
      if (!size || !leverage || !currentPrice) return;

      const sizeNum = parseFloat(size);
      const leverageNum = parseFloat(leverage);
      const priceNum = parseFloat(currentPrice);

      if (sizeNum > 0 && leverageNum > 0 && priceNum > 0) {
        // Calculate required margin
        const positionValue = sizeNum * priceNum;
        const margin = positionValue / leverageNum;
        setRequiredMargin(margin.toFixed(2));

        // Calculate liquidation price (simplified)
        const liqPriceOffset = priceNum * (1 - (1 / leverageNum) * 0.9);
        const liqPrice = direction === 'LONG'
          ? priceNum - liqPriceOffset
          : priceNum + liqPriceOffset;
        setLiquidationPrice(liqPrice.toFixed(2));

        // Form is valid if size > 0
        setFormValid(true);

        // Add debug log
        console.log('DEBUG: Validating form with values:', {
          size: sizeNum,
          leverage: leverageNum,
          price: priceNum,
          margin: margin.toFixed(2),
          liquidation: liqPrice.toFixed(2),
          isValid: true
        });
      }
    } catch (err) {
      console.error('Error calculating values:', err);
    }
  }, [size, leverage, direction, currentPrice]);

  // Effect to recalculate on input changes
  useEffect(() => {
    calculateValues();
  }, [calculateValues]);

  // Fetch current price periodically
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetchCurrentPriceAction('BTC');
        if (response.isSuccess && response.data) {
          setCurrentPrice(response.data.price);
        }
      } catch (err) {
        console.error('Error fetching price:', err);
      }
    };

    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSizeChange = (e) => {
    setSize(e.target.value);
  };

  const handleLeverageChange = (e) => {
    setLeverage(e.target.value);
  };

  const handleDirectionChange = (value) => {
    setDirection(value);
  };

  const handleTemplateChange = (e) => {
    setTemplate(e.target.value);
  };

  // CRITICAL FIX: Add direct click handler without relying on React's disabled state
  const handleReviewClick = (e) => {
    e.preventDefault();
    console.log('DEBUG: Review button clicked directly');

    if (size && parseFloat(size) > 0) {
      handleSubmit(e);
    } else {
      console.log('DEBUG: Validation failed in direct click handler');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Submit function called!');

    if (!size || parseFloat(size) <= 0) {
      console.error('Size validation failed, but button was clicked');
      setError('Please enter a valid size');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Call your trade submission function here
      if (onTradeSubmit) {
        await onTradeSubmit({
          size: parseFloat(size),
          leverage: parseFloat(leverage),
          direction,
          template,
          currentPrice: parseFloat(currentPrice || '0'),
          requiredMargin: parseFloat(requiredMargin),
          liquidationPrice: parseFloat(liquidationPrice)
        });
      }
    } catch (err) {
      console.error('Error submitting trade:', err);
      setError(err.message || 'Failed to submit trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="trading-form">
      <form onSubmit={handleSubmit}>
        {currentPrice && (
          <div className="price-display">
            Current BTC Price: ${parseFloat(currentPrice).toLocaleString()}
          </div>
        )}

        <div className="direction-buttons">
          <button
            type="button"
            className={direction === 'LONG' ? 'active' : ''}
            onClick={() => handleDirectionChange('LONG')}
          >
            LONG
          </button>
          <button
            type="button"
            className={direction === 'SHORT' ? 'active' : ''}
            onClick={() => handleDirectionChange('SHORT')}
          >
            SHORT
          </button>
        </div>

        <div className="template-select">
          <label>Trade Template (Optional)</label>
          <select value={template} onChange={handleTemplateChange}>
            <option value="None">None</option>
            <option value="Template1">Template 1</option>
            <option value="Template2">Template 2</option>
          </select>
        </div>

        <div className="size-input">
          <label>Size (BTC)</label>
          <input
            type="number"
            value={size}
            onChange={handleSizeChange}
            step="0.001"
            min="0.001"
          />
          <div className="min-order">
            Minimum order value: $10 (~0.0001 BTC at current prices)
          </div>
        </div>

        <div className="leverage-input">
          <label>Leverage (for estimation) (Max: 40x)</label>
          <input
            type="number"
            value={leverage}
            onChange={handleLeverageChange}
            min="1"
            max="40"
          />
        </div>

        <div className="estimates">
          <div className="estimate-item">
            <label>Required Margin:</label>
            <span>${requiredMargin}</span>
          </div>
          <div className="estimate-item">
            <label>Liquidation Price:</label>
            <span>${liquidationPrice}</span>
          </div>
          <div className="disclaimer">
            Estimates are approximate and do not include fees or funding.
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {/* CRITICAL FIX: Use onClick directly instead of relying only on disabled */}
        <button
          type="button"
          className="review-button"
          onClick={handleReviewClick}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Review Trade'}
        </button>
      </form>
    </div>
  );
};

export default TradingForm; 