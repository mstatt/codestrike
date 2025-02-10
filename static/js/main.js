document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown timer
    initializeCountdown();

    // Form validation
    const form = document.getElementById('submissionForm');
    const inputs = form.querySelectorAll('input[required]');

    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
        input.addEventListener('blur', validateInput);
    });

    form.addEventListener('submit', handleSubmission);
});

function validateInput(event) {
    const input = event.target;
    const validationIcon = input.nextElementSibling;

    if (input.checkValidity()) {
        validationIcon.innerHTML = '<i class="bi bi-check-circle-fill"></i>';
        validationIcon.classList.add('valid');
        validationIcon.classList.remove('invalid');
    } else {
        validationIcon.innerHTML = '<i class="bi bi-x-circle-fill"></i>';
        validationIcon.classList.add('invalid');
        validationIcon.classList.remove('valid');
    }
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    alertContainer.appendChild(alert);

    // Remove alert after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

function initializeCountdown() {
    fetch('/get_deadline')
        .then(response => response.json())
        .then(data => {
            const deadline = new Date(data.deadline).getTime();

            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = deadline - now;

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                document.getElementById('countdown').innerHTML = 
                    `${days}d ${hours}h ${minutes}m ${seconds}s`;

                if (distance < 0) {
                    clearInterval(timer);
                    document.getElementById('countdown').innerHTML = "DEADLINE PASSED";
                    document.querySelector('button[type="submit"]').disabled = true;
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Error fetching deadline:', error);
            showAlert('Error loading deadline information');
        });
}

function handleSubmission(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('email', document.getElementById('email').value);
    formData.append('github', document.getElementById('github').value);
    formData.append('video', document.getElementById('video').value);

    fetch('/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            document.getElementById('submissionForm').reset();
            // Reset validation icons
            document.querySelectorAll('.validation-icon').forEach(icon => {
                icon.innerHTML = '';
                icon.classList.remove('valid', 'invalid');
            });
        } else {
            showAlert(data.message, 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred while submitting the form');
    });
}