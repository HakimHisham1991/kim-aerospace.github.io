document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const lengthInput = document.getElementById('length');
    const vfInput = document.getElementById('vf');
    const tcInput = document.getElementById('tc');
    const calcLRadio = document.getElementById('calc-l');
    const calcVfRadio = document.getElementById('calc-vf');
    const calcTcRadio = document.getElementById('calc-tc');
    
    // Function to update input states
    function updateInputStates() {
        if (calcLRadio.checked) {
            // Calculating L (length) - disable L input
            lengthInput.disabled = true;
            vfInput.disabled = false;
            tcInput.disabled = false;
        } 
        else if (calcVfRadio.checked) {
            // Calculating vf (feed rate) - disable vf input
            lengthInput.disabled = false;
            vfInput.disabled = true;
            tcInput.disabled = false;
        } 
        else if (calcTcRadio.checked) {
            // Calculating Tc (cutting time) - disable Tc input
            lengthInput.disabled = false;
            vfInput.disabled = false;
            tcInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Update input states when radio selection changes
    calcLRadio.addEventListener('change', updateInputStates);
    calcVfRadio.addEventListener('change', updateInputStates);
    calcTcRadio.addEventListener('change', updateInputStates);
    
    // Initialize input states
    updateInputStates();
    
    // Allow calculation on Enter key press
    [lengthInput, vfInput, tcInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    function calculate() {
        // Get and sanitize input values
        const length = parseFloat(lengthInput.value.replace(/,/g, ''));
        const vf = parseFloat(vfInput.value.replace(/,/g, ''));
        const tc = parseFloat(tcInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcLRadio.checked) {
            // Calculate L (cutting length)
            if (isNaN(vf) || isNaN(tc) || vf <= 0 || tc <= 0) {
                alert('Please enter valid positive numbers for Feed Rate and Cutting Time');
                return;
            }
            const L = vf * tc;
            lengthInput.value = Math.round(L);
        } 
        else if (calcVfRadio.checked) {
            // Calculate vf (feed rate)
            if (isNaN(length) || isNaN(tc) || length <= 0 || tc <= 0) {
                alert('Please enter valid positive numbers for Length and Cutting Time');
                return;
            }
            const calculatedVf = length / tc;
            vfInput.value = calculatedVf.toFixed(2);
        } 
        else if (calcTcRadio.checked) {
            // Calculate Tc (cutting time)
            if (isNaN(length) || isNaN(vf) || length <= 0 || vf <= 0) {
                alert('Please enter valid positive numbers for Length and Feed Rate');
                return;
            }
            const calculatedTc = length / vf;
            tcInput.value = calculatedTc.toFixed(2);
        }
    }
});