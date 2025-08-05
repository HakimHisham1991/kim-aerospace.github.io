document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const calculateBtn = document.getElementById('calculate-btn');
    const workpieceLengthInput = document.getElementById('workpiece-length');
    const cuttingLengthInput = document.getElementById('cutting-length');
    const tcInput = document.getElementById('tc');
    const calcLmRadio = document.getElementById('calc-lm');
    const calcLRadio = document.getElementById('calc-l');
    const calcTcRadio = document.getElementById('calc-tc');
    
    // Function to update input states
    function updateInputStates() {
        if (calcLmRadio.checked) {
            // Calculating lm (workpiece length) - disable lm input
            workpieceLengthInput.disabled = true;
            cuttingLengthInput.disabled = false;
            tcInput.disabled = false;
        } 
        else if (calcLRadio.checked) {
            // Calculating l (cutting length per min) - disable l input
            workpieceLengthInput.disabled = false;
            cuttingLengthInput.disabled = true;
            tcInput.disabled = false;
        } 
        else if (calcTcRadio.checked) {
            // Calculating Tc (cutting time) - disable Tc input
            workpieceLengthInput.disabled = false;
            cuttingLengthInput.disabled = false;
            tcInput.disabled = true;
        }
    }
    
    // Add event listeners
    calculateBtn.addEventListener('click', calculate);
    
    // Update input states when radio selection changes
    calcLmRadio.addEventListener('change', updateInputStates);
    calcLRadio.addEventListener('change', updateInputStates);
    calcTcRadio.addEventListener('change', updateInputStates);
    
    // Initialize input states
    updateInputStates();
    
    // Allow calculation on Enter key press
    [workpieceLengthInput, cuttingLengthInput, tcInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });
    
    function calculate() {
        // Get and sanitize input values
        const workpieceLength = parseFloat(workpieceLengthInput.value.replace(/,/g, ''));
        const cuttingLength = parseFloat(cuttingLengthInput.value.replace(/,/g, ''));
        const tc = parseFloat(tcInput.value.replace(/,/g, ''));
        
        // Calculate based on selected radio
        if (calcLmRadio.checked) {
            // Calculate lm (workpiece length)
            if (isNaN(cuttingLength) || isNaN(tc) || cuttingLength <= 0 || tc <= 0) {
                alert('Please enter valid positive numbers for Cutting Length per min and Cutting Time');
                return;
            }
            const lm = cuttingLength * tc;
            workpieceLengthInput.value = Math.round(lm);
        } 
        else if (calcLRadio.checked) {
            // Calculate l (cutting length per min)
            if (isNaN(workpieceLength) || isNaN(tc) || workpieceLength <= 0 || tc <= 0) {
                alert('Please enter valid positive numbers for Workpiece Length and Cutting Time');
                return;
            }
            const calculatedL = workpieceLength / tc;
            cuttingLengthInput.value = calculatedL.toFixed(2);
        } 
        else if (calcTcRadio.checked) {
            // Calculate Tc (cutting time)
            if (isNaN(workpieceLength) || isNaN(cuttingLength) || workpieceLength <= 0 || cuttingLength <= 0) {
                alert('Please enter valid positive numbers for Workpiece Length and Cutting Length per min');
                return;
            }
            const calculatedTc = workpieceLength / cuttingLength;
            tcInput.value = calculatedTc.toFixed(2);
        }
    }
});