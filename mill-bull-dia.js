document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const deffInput = document.getElementById('deff');
    const dInput = document.getElementById('d');
    const rInput = document.getElementById('r');
    const adocInput = document.getElementById('adoc');
    const calcDeffRadio = document.getElementById('calc-deff');
    const calcDRadio = document.getElementById('calc-d');
    const calcRRadio = document.getElementById('calc-r');
    const calcAdocRadio = document.getElementById('calc-adoc');
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-message';
    document.querySelector('.calculator-content').appendChild(resultDiv);

    function updateInputStates() {
        if (calcDeffRadio.checked) {
            deffInput.disabled = true;
            dInput.disabled = false;
            rInput.disabled = false;
            adocInput.disabled = false;
        } else if (calcDRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = true;
            rInput.disabled = false;
            adocInput.disabled = false;
        } else if (calcRRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = false;
            rInput.disabled = true;
            adocInput.disabled = false;
        } else if (calcAdocRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = false;
            rInput.disabled = false;
            adocInput.disabled = true;
        }
        resultDiv.textContent = '';
    }

    calculateBtn.addEventListener('click', calculate);
    [calcDeffRadio, calcDRadio, calcRRadio, calcAdocRadio].forEach(radio => {
        radio.addEventListener('change', updateInputStates);
    });
    updateInputStates();

    [deffInput, dInput, rInput, adocInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });

    function calculate() {
        resultDiv.textContent = '';
        const deff = parseFloat(deffInput.value.replace(/,/g, '')) || 0;
        const d = parseFloat(dInput.value.replace(/,/g, '')) || 0;
        const r = parseFloat(rInput.value.replace(/,/g, '')) || 0;
        const adoc = parseFloat(adocInput.value.replace(/,/g, '')) || 0;

        if (calcDeffRadio.checked) {
            if (d <= 0 || r <= 0 || adoc <= 0) {
                showError('Please enter valid positive numbers for all inputs');
                return;
            }
            if (adoc > 2 * r) {
                showError('ADOC must be ≤ 2×Corner Radius for valid results');
                return;
            }
            const calculatedDeff = d - 2 * r + 2 * Math.sqrt(adoc * (2 * r - adoc));
            deffInput.value = calculatedDeff.toFixed(3);
        } else if (calcDRadio.checked) {
            if (deff <= 0 || r <= 0 || adoc <= 0) {
                showError('Please enter valid positive numbers for all inputs');
                return;
            }
            if (adoc > 2 * r) {
                showError('ADOC must be ≤ 2×Corner Radius for valid results');
                return;
            }
            const calculatedD = deff + 2 * r - 2 * Math.sqrt(adoc * (2 * r - adoc));
            dInput.value = calculatedD.toFixed(3);
        } else if (calcRRadio.checked) {
            if (deff <= 0 || d <= 0 || adoc <= 0) {
                showError('Please enter valid positive numbers for all inputs');
                return;
            }

            const a = 4;
            const b = 4*(deff - d) - 8*adoc;
            const c = Math.pow(deff - d, 2) + 4*Math.pow(adoc, 2);

            const discriminant = b*b - 4*a*c;
            
            if (discriminant < 0) {
                showResult('No real solution exists');
                return;
            }

            const r1 = (-b + Math.sqrt(discriminant))/(2*a);
            const r2 = (-b - Math.sqrt(discriminant))/(2*a);

            const validRs = [];
            if (r1 >= adoc/2 && r1 > 0) validRs.push(r1.toFixed(3));
            if (r2 >= adoc/2 && r2 > 0 && Math.abs(r2 - r1) > 0.001) validRs.push(r2.toFixed(3));

            if (validRs.length === 0) {
                showResult('No valid solution exists');
            } else {
                rInput.value = validRs[0];
                if (validRs.length > 1) {
                    showResult('Possible radii: ' + validRs.join(' mm, ') + ' mm');
                }
            }
        } else if (calcAdocRadio.checked) {
            if (isNaN(deff) || isNaN(d) || isNaN(r) || deff <= 0 || d <= 0 || r <= 0) {
                showError('Please enter valid positive numbers for all inputs');
                return;
            }
            
            // Correct ADOC calculation:
            // Start with original formula: Deff = D - 2r + 2*sqrt(ADOC*(2r - ADOC))
            // Rearrange: (Deff - D + 2r)/2 = sqrt(ADOC*(2r - ADOC))
            // Square both sides: [(Deff - D + 2r)/2]^2 = ADOC*(2r - ADOC)
            // Let k = [(Deff - D + 2r)/2]^2
            // Then: k = 2r*ADOC - ADOC^2
            // Rearrange: ADOC^2 - 2r*ADOC + k = 0
            // Solve quadratic equation for ADOC
            
            const k = Math.pow((deff - d + 2 * r) / 2, 2);
            
            // Quadratic equation coefficients: ADOC^2 - 2r*ADOC + k = 0
            const a = 1;
            const b = -2 * r;
            const c = k;
            
            const discriminant = b * b - 4 * a * c;
            
            if (discriminant < 0) {
                showError('No valid ADOC exists for these parameters');
                return;
            }
            
            const adoc1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const adoc2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            
            // Valid ADOC must be between 0 and 2r
            const validAdocs = [];
            if (adoc1 >= 0 && adoc1 <= 2 * r) validAdocs.push(adoc1);
            if (adoc2 >= 0 && adoc2 <= 2 * r && Math.abs(adoc2 - adoc1) > 0.001) validAdocs.push(adoc2);
            
            if (validAdocs.length === 0) {
                showError('No valid ADOC exists for these parameters');
            } else {
                adocInput.value = validAdocs[0].toFixed(3);
                if (validAdocs.length > 1) {
                    showResult('Possible ADOC values: ' + validAdocs.map(a => a.toFixed(3)).join(' mm, ') + ' mm');
                }
            }
        }
    }

    function showError(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'red';
    }

    function showResult(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = '#0066cc';
    }
});