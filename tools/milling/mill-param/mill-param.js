document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements for vc calculations
    const calculateBtn = document.getElementById('calculate-btn');
    const diameterInput = document.getElementById('diameter');
    const speedInput = document.getElementById('speed');
    const vcInput = document.getElementById('vc');
    const calcNRadio = document.getElementById('calc-n');
    const calcDRadio = document.getElementById('calc-diameter');
    const calcVcRadio = document.getElementById('calc-vc');
    
    // Get DOM elements for fz calculations
    const vfInput = document.getElementById('vf');
    const zInput = document.getElementById('z');
    const fzInput = document.getElementById('fz');
    const calcVfRadio = document.getElementById('calc-vf');
    const calcZRadio = document.getElementById('calc-z');
    const calcFzRadio = document.getElementById('calc-fz');
    
    // Function to update input states for vc calculations
    function updateVcInputStates() {
        if (calcNRadio.checked) {
            speedInput.disabled = true;
            diameterInput.disabled = false;
            vcInput.disabled = false;
        } 
        else if (calcDRadio.checked) {
            speedInput.disabled = false;
            diameterInput.disabled = true;
            vcInput.disabled = false;
        } 
        else if (calcVcRadio.checked) {
            speedInput.disabled = false;
            diameterInput.disabled = false;
            vcInput.disabled = true;
        }
    }
    
    // Function to update input states for fz calculations
    function updateFzInputStates() {
        if (calcVfRadio.checked) {
            vfInput.disabled = true;
            zInput.disabled = false;
            fzInput.disabled = false;
        } 
        else if (calcZRadio.checked) {
            vfInput.disabled = false;
            zInput.disabled = true;
            fzInput.disabled = false;
        } 
        else if (calcFzRadio.checked) {
            vfInput.disabled = false;
            zInput.disabled = false;
            fzInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculateAll);
    
    // Update input states when radio selection changes
    calcNRadio.addEventListener('change', updateVcInputStates);
    calcDRadio.addEventListener('change', updateVcInputStates);
    calcVcRadio.addEventListener('change', updateVcInputStates);
    calcVfRadio.addEventListener('change', updateFzInputStates);
    calcZRadio.addEventListener('change', updateFzInputStates);
    calcFzRadio.addEventListener('change', updateFzInputStates);
    
    // Initialize input states
    updateVcInputStates();
    updateFzInputStates();
    
    // Allow calculation on Enter key press
    [diameterInput, speedInput, vcInput, vfInput, zInput, fzInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculateAll();
            }
        });
    });
    
    function calculateVc() {
        // Get and sanitize input values
        const diameter = parseFloat(diameterInput.value.replace(/,/g, ''));
        const speed = parseFloat(speedInput.value.replace(/,/g, ''));
        const vc = parseFloat(vcInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcNRadio.checked) {
            // Calculate n (spindle speed)
            if (isNaN(diameter) || isNaN(vc) || diameter <= 0 || vc <= 0) {
                alert('Please enter valid positive numbers for Diameter and Cutting Speed');
                return false;
            }
            const n = (vc * 1000) / (3.14 * diameter);
            speedInput.value = Math.round(n);
            return true;
        } 
        else if (calcDRadio.checked) {
            // Calculate D (diameter)
            if (isNaN(speed) || isNaN(vc) || speed <= 0 || vc <= 0) {
                alert('Please enter valid positive numbers for Speed and Cutting Speed');
                return false;
            }
            const D = (vc * 1000) / (3.14 * speed);
            diameterInput.value = D.toFixed(2);
            return true;
        } 
        else if (calcVcRadio.checked) {
            // Calculate vc (cutting speed)
            if (isNaN(diameter) || isNaN(speed) || diameter <= 0 || speed <= 0) {
                alert('Please enter valid positive numbers for Diameter and Speed');
                return false;
            }
            const calculatedVc = (3.14 * diameter * speed) / 1000;
            vcInput.value = calculatedVc.toFixed(2);
            return true;
        }
    }
    
    function calculateFz() {
        // Get and sanitize input values
        const vf = parseFloat(vfInput.value.replace(/,/g, ''));
        const z = parseFloat(zInput.value.replace(/,/g, ''));
        const fz = parseFloat(fzInput.value.replace(/,/g, ''));
        const n = parseFloat(speedInput.value.replace(/,/g, '')) || 0;
        
        // Calculate based on selected radio
        if (calcVfRadio.checked) {
            // Calculate vf (table feed)
            if (isNaN(z) || isNaN(n) || isNaN(fz) || z <= 0 || n <= 0 || fz <= 0) {
                alert('Please enter valid positive numbers for Number of Teeth, Spindle Speed, and Feed per Tooth');
                return false;
            }
            const calculatedVf = z * n * fz;
            vfInput.value = Math.round(calculatedVf);
            return true;
        } 
        else if (calcZRadio.checked) {
            // Calculate z (number of teeth)
            if (isNaN(vf) || isNaN(n) || isNaN(fz) || vf <= 0 || n <= 0 || fz <= 0) {
                alert('Please enter valid positive numbers for Table Feed, Spindle Speed, and Feed per Tooth');
                return false;
            }
            const calculatedZ = vf / (n * fz);
            zInput.value = Math.round(calculatedZ);
            return true;
        }
        else if (calcFzRadio.checked) {
            // Calculate fz (feed per tooth)
            if (isNaN(vf) || isNaN(z) || isNaN(n) || vf <= 0 || z <= 0 || n <= 0) {
                alert('Please enter valid positive numbers for Table Feed, Number of Teeth, and Spindle Speed');
                return false;
            }
            const calculatedFz = vf / (z * n);
            fzInput.value = calculatedFz.toFixed(6);
            return true;
        }
    }
    
    function calculateAll() {
        const vcSuccess = calculateVc();
        const fzSuccess = calculateFz();
        
        // If both calculations failed, show a general error
        if (!vcSuccess && !fzSuccess) {
            alert('Please enter valid values for at least one calculation');
        }
    }
});
