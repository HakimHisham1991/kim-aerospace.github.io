document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const diameterInput = document.getElementById('diameter');
    const speedInput = document.getElementById('speed');
    const resultDiv = document.getElementById('result');
    const vcResult = document.getElementById('vc-result');
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculateCuttingSpeed);
    
    // Allow calculation on Enter key press
    [diameterInput, speedInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculateCuttingSpeed();
            }
        });
    });
    
    function calculateCuttingSpeed() {
        // Get and sanitize input values
        const diameter = parseFloat(diameterInput.value.replace(/,/g, ''));
        const speed = parseFloat(speedInput.value.replace(/,/g, ''));
        
        // Validate inputs
        if (isNaN(diameter) || isNaN(speed) || diameter <= 0 || speed <= 0) {
            alert('Please enter valid positive numbers for all fields');
            return;
        }
        
        // Calculate cutting speed
        const vc = (Math.PI * diameter * speed) / 1000;
        
        // Display result with 2 decimal places
        vcResult.textContent = vc.toFixed(2);
        resultDiv.style.display = 'block';
        
        // Scroll to result if it's not fully visible
        resultDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
});