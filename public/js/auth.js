// Authentication related JavaScript functions

document.addEventListener('DOMContentLoaded', function() {
    // Password strength meter
    const passwordInput = document.getElementById('password');
    const strengthMeter = document.getElementById('password-strength-meter');
    const strengthText = document.getElementById('password-strength-text');
    
    if (passwordInput && strengthMeter && strengthText) {
        passwordInput.addEventListener('input', function() {
            const val = passwordInput.value;
            const result = zxcvbn(val);
            
            // Update the strength meter
            strengthMeter.value = result.score;
            
            // Update the text indicator
            if (val === '') {
                strengthText.innerHTML = 'Strength';
            } else {
                let strengthLabels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
                strengthText.innerHTML = 'Strength: ' + strengthLabels[result.score];
                
                // Update color based on score
                let strengthColors = ['#dc3545', '#dc3545', '#ffc107', '#28a745', '#28a745'];
                strengthText.style.color = strengthColors[result.score];
            }
        });
    }
    
    // Password confirmation validation
    const confirmPasswordInput = document.getElementById('confirm_password');
    const passwordMatchText = document.getElementById('password-match');
    
    if (passwordInput && confirmPasswordInput && passwordMatchText) {
        confirmPasswordInput.addEventListener('input', function() {
            if (passwordInput.value === confirmPasswordInput.value) {
                passwordMatchText.innerHTML = 'Passwords match';
                passwordMatchText.style.color = '#28a745';
            } else {
                passwordMatchText.innerHTML = 'Passwords do not match';
                passwordMatchText.style.color = '#dc3545';
            }
        });
    }
    
    // Form validation
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirm_password').value;
            
            if (password !== confirmPassword) {
                e.preventDefault();
                alert('Passwords do not match!');
                return false;
            }
            
            if (password.length < 6) {
                e.preventDefault();
                alert('Password must be at least 6 characters long!');
                return false;
            }
            
            return true;
        });
    }
    
    // Auto-hide flash messages after 5 seconds
    const flashMessages = document.querySelectorAll('.flash-message');
    if (flashMessages.length > 0) {
        flashMessages.forEach(function(message) {
            setTimeout(function() {
                message.classList.add('fade');
                setTimeout(function() {
                    message.remove();
                }, 500);
            }, 5000);
        });
    }
}); 