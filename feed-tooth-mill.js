document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const vfInput = document.getElementById('vf');
    const zInput = document.getElementById('z');
    const nInput = document.getElementById('n');
    const fzInput = document.getElementById('fz');
    const calcVfRadio = document.getElementById('calc-vf');
    const calcZRadio = document.getElementById('calc-z');
    const calcNRadio = document.getElementById('calc-n');
    const calcFzRadio = document.getElementById('calc-fz');
    
    // Function to update input states
    function updateInputStates() {
        if (calcVfRadio.checked) {
            // Calculating vf - disable vf input
            vfInput.disabled = true;
            zInput.disabled = false;
            nInput.disabled = false;
            fzInput.disabled = false;
        } 
        else if (calcZRadio.checked) {
            // Calculating z - disable z input
            vfInput.disabled = false;
            zInput.disabled = true;
            nInput.disabled = false;
            fzInput.disabled = false;
        } 
        else if (calcNRadio.checked) {
            // Calculating n - disable n input
            vfInput.disabled = false;
            zInput.disabled = false;
            nInput.disabled = true;
            fzInput.disabled = false;
        }
        else if (calcFzRadio.checked) {
            // Calculating fz - disable fz input
            vfInput.disabled = false;
            zInput.disabled = false;
            nInput.disabled = false;
            fzInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Update input states when radio selection changes
    calcVfRadio.addEventListener('change', updateInputStates);
    calcZRadio.addEventListener('change', updateInputStates);
    calcNRadio.addEventListener('change', updateInputStates);
    calcFzRadio.addEventListener('change', updateInputStates);
    
    // Initialize input states
    updateInputStates();
    
    // Allow calculation on Enter key press
    [vfInput, zInput, nInput, fzInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    function calculate() {
        // Get and sanitize input values
        const vf = parseFloat(vfInput.value.replace(/,/g, ''));
        const z = parseFloat(zInput.value.replace(/,/g, ''));
        const n = parseFloat(nInput.value.replace(/,/g, ''));
        const fz = parseFloat(fzInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcVfRadio.checked) {
            // Calculate vf (table feed)
            if (isNaN(z) || isNaN(n) || isNaN(fz) || z <= 0 || n <= 0 || fz <= 0) {
                alert('Please enter valid positive numbers for Number of Teeth, Spindle Speed, and Feed per Tooth');
                return;
            }
            const calculatedVf = z * n * fz;
            vfInput.value = Math.round(calculatedVf);
        } 
        else if (calcZRadio.checked) {
            // Calculate z (number of teeth)
            if (isNaN(vf) || isNaN(n) || isNaN(fz) || vf <= 0 || n <= 0 || fz <= 0) {
                alert('Please enter valid positive numbers for Table Feed, Spindle Speed, and Feed per Tooth');
                return;
            }
            const calculatedZ = vf / (n * fz);
            zInput.value = Math.round(calculatedZ);
        } 
        else if (calcNRadio.checked) {
            // Calculate n (spindle speed)
            if (isNaN(vf) || isNaN(z) || isNaN(fz) || vf <= 0 || z <= 0 || fz <= 0) {
                alert('Please enter valid positive numbers for Table Feed, Number of Teeth, and Feed per Tooth');
                return;
            }
            const calculatedN = vf / (z * fz);
            nInput.value = Math.round(calculatedN);
        }
        else if (calcFzRadio.checked) {
            // Calculate fz (feed per tooth)
            if (isNaN(vf) || isNaN(z) || isNaN(n) || vf <= 0 || z <= 0 || n <= 0) {
                alert('Please enter valid positive numbers for Table Feed, Number of Teeth, and Spindle Speed');
                return;
            }
            const calculatedFz = vf / (z * n);
            fzInput.value = calculatedFz.toFixed(3);
        }
    }
});