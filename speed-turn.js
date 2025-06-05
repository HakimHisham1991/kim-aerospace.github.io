
        function calculateCuttingSpeed() {
            // Get input values
            const diameter = parseFloat(document.getElementById('diameter').value);
            const speed = parseFloat(document.getElementById('speed').value);
            
            // Validate inputs
            if (isNaN(diameter) || isNaN(speed) || diameter <= 0 || speed <= 0) {
                alert('Please enter valid positive numbers for all fields');
                return;
            }
            
            // Calculate cutting speed
            const vc = (Math.PI * diameter * speed) / 1000;
            
            // Display result with 2 decimal places
            document.getElementById('vc-result').textContent = vc.toFixed(2);
            document.getElementById('result').style.display = 'block';
        }
