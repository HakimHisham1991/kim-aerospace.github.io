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
        // Reset input background colors
        deffInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        rInput.style.backgroundColor = '';
        adocInput.style.backgroundColor = '';
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
        // Reset input background colors
        deffInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        rInput.style.backgroundColor = '';
        adocInput.style.backgroundColor = '';

        const deff = parseFloat(deffInput.value.replace(/,/g, '')) || 0;
        const d = parseFloat(dInput.value.replace(/,/g, '')) || 0;
        const r = parseFloat(rInput.value.replace(/,/g, '')) || 0;
        const adoc = parseFloat(adocInput.value.replace(/,/g, '')) || 0;

        // Common validation for all calculations, skipping the disabled input
        if (!calcDeffRadio.checked && deffInput.disabled === false && deff <= 0) {
            showError('All values must be positive numbers', deffInput);
            return;
        }
        if (!calcDRadio.checked && dInput.disabled === false && d <= 0) {
            showError('All values must be positive numbers', dInput);
            return;
        }
        if (!calcRRadio.checked && rInput.disabled === false && r <= 0) {
            showError('All values must be positive numbers', rInput);
            return;
        }
        if (!calcAdocRadio.checked && adocInput.disabled === false && adoc <= 0) {
            showError('All values must be positive numbers', adocInput);
            return;
        }
        if (!calcAdocRadio.checked && !calcRRadio.checked && adoc > r) {
            showError('ADOC must be ≤ Corner Radius for valid results', adocInput);
            return;
        }
        if (!calcRRadio.checked && !calcDRadio.checked && r > d/2) {
            showError('r must be ≤ D/2 for valid results', rInput);
            return;
        }
        if (!calcDeffRadio.checked && !calcDRadio.checked && deff > d) {
            showError('Deff must be less than D for valid results', deffInput);
            return;
        }

        if (calcDeffRadio.checked) {
            const calculatedDeff = d - 2 * r + 2 * Math.sqrt(adoc * (2 * r - adoc));
            if (isNaN(calculatedDeff) || calculatedDeff <= 0) {
                showError('Invalid calculation: resulting Deff is not positive', deffInput);
                return;
            }
            if (calculatedDeff > d) {
                showError('Deff must be less than D for valid results', deffInput);
                return;
            }
            deffInput.value = calculatedDeff.toFixed(3);
        } else if (calcDRadio.checked) {
            const calculatedD = deff + 2 * r - 2 * Math.sqrt(adoc * (2 * r - adoc));
            if (isNaN(calculatedD) || calculatedD <= 0) {
                showError('Invalid calculation: resulting D is not positive', dInput);
                return;
            }
            if (r > calculatedD/2) {
                showError('r must be ≤ D/2 for valid results', rInput);
                return;
            }
            if (deff > calculatedD) {
                showError('Deff must be less than D for valid results', deffInput);
                return;
            }
            dInput.value = calculatedD.toFixed(3);
        } else if (calcRRadio.checked) {
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
            if (r1 > 0 && r1 <= d/2 && r1 >= adoc) validRs.push(r1.toFixed(3));
            if (r2 > 0 && r2 <= d/2 && r2 >= adoc && Math.abs(r2 - r1) > 0.001) validRs.push(r2.toFixed(3));

            if (validRs.length === 0) {
                showResult('No valid solution exists');
            } else {
                rInput.value = validRs[0];
                if (validRs.length > 1) {
                    showResult('Possible radii: ' + validRs.join(' mm, ') + ' mm');
                }
            }
        } else if (calcAdocRadio.checked) {
            const k = Math.pow((deff - d + 2 * r) / 2, 2);
            const a = 1;
            const b = -2 * r;
            const c = k;
            
            const discriminant = b * b - 4 * a * c;
            
            if (discriminant < 0) {
                showError('No valid ADOC exists for these parameters', adocInput);
                return;
            }
            
            const adoc1 = (-b + Math.sqrt(discriminant)) / (2 * a);
            const adoc2 = (-b - Math.sqrt(discriminant)) / (2 * a);
            
            const validAdocs = [];
            if (adoc1 > 0 && adoc1 <= r) validAdocs.push(adoc1);
            if (adoc2 > 0 && adoc2 <= r && Math.abs(adoc2 - adoc1) > 0.001) validAdocs.push(adoc2);
            
            if (validAdocs.length === 0) {
                showError('No valid ADOC exists for these parameters', adocInput);
            } else {
                adocInput.value = validAdocs[0].toFixed(3);
                if (validAdocs.length > 1) {
                    showResult('Possible ADOC values: ' + validAdocs.map(a => a.toFixed(3)).join(' mm, ') + ' mm');
                }
            }
        }
    }

    function showError(message, inputElement) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'red';
        if (inputElement) {
            inputElement.style.backgroundColor = '#e84855';
        }
    }

    function showResult(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = '#0066cc';
    }
});
