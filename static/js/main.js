document.addEventListener('DOMContentLoaded', function() {
    // Initialize countdown timer
    initializeCountdown();

    // Form validation
    const submissionForm = document.getElementById('projectSubmissionForm');
    const inputs = submissionForm.querySelectorAll('input[required]');

    inputs.forEach(input => {
        input.addEventListener('input', validateInput);
        input.addEventListener('blur', validateInput);
    });

    submissionForm.addEventListener('submit', handleSubmission);

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon();

    // Show submissions button since form is visible by default
    document.getElementById('viewSubmissionsBtn').style.display = 'block';

    // Load submissions after the page loads
    loadSubmissions();

    // Add admin-related event listeners
    const adminLoginForm = document.getElementById('adminLoginForm');
    const adminUpdateForm = document.getElementById('adminUpdateForm');

    adminLoginForm.addEventListener('submit', handleAdminLogin);
    adminUpdateForm.addEventListener('submit', handleAdminUpdate);
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

function toggleTheme() {
    const html = document.documentElement;
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeToggleIcon();
}

function updateThemeToggleIcon() {
    const themeToggle = document.querySelector('.theme-toggle i');
    const currentTheme = document.documentElement.getAttribute('data-theme');

    if (currentTheme === 'dark') {
        themeToggle.classList.remove('bi-moon-fill');
        themeToggle.classList.add('bi-sun-fill');
    } else {
        themeToggle.classList.remove('bi-sun-fill');
        themeToggle.classList.add('bi-moon-fill');
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
    formData.append('live_demo_url', document.getElementById('live_demo_url').value);

    const username = document.getElementById('demo_username').value;
    const password = document.getElementById('demo_password').value;
    if (username && password) {
        formData.append('demo_username', username);
        formData.append('demo_password', password);
    }

    fetch('/submit', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert(data.message, 'success');
                document.getElementById('projectSubmissionForm').reset();
                // Reset validation icons
                document.querySelectorAll('.validation-icon').forEach(icon => {
                    icon.innerHTML = '';
                    icon.classList.remove('valid', 'invalid');
                });
                loadSubmissions(); // Reload the submissions list
            } else {
                showAlert(data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while submitting the form');
        });
}

function loadSubmissions() {
    fetch('/submissions')
        .then(response => response.json())
        .then(data => {
            const submissionsList = document.getElementById('submissionsList');
            submissionsList.innerHTML = '';

            data.submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                .forEach(submission => {
                    const submissionDate = new Date(submission.submitted_at).toLocaleString();
                    const item = document.createElement('div');
                    item.className = 'list-group-item neuromorphic mb-2';

                    item.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <strong>Email:</strong> ${submission.email}<br>
                                <strong>GitHub:</strong> <a href="${submission.github_repo}" target="_blank">${submission.github_repo}</a><br>
                                <strong>Demo Video:</strong> <a href="${submission.demo_video}" target="_blank">View Demo</a><br>
                                <strong>Live Demo:</strong> <a href="${submission.live_demo_url}" target="_blank">View Live Demo</a>
                            </div>
                            <small class="text-muted">${submissionDate}</small>
                        </div>
                    `;
                    submissionsList.appendChild(item);
                });
        })
        .catch(error => {
            console.error('Error loading submissions:', error);
            showAlert('Error loading submissions');
        });
}

// Add admin-related functions
function handleAdminLogin(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('email', document.getElementById('adminEmail').value);
    formData.append('password', document.getElementById('adminPassword').value);

    fetch('/admin/login', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close login modal and open admin panel
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                loginModal.hide();

                const adminPanelModal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
                adminPanelModal.show();

                // Load registered emails
                loadRegisteredEmails();

                // Reset form
                document.getElementById('adminLoginForm').reset();
            } else {
                showAlert(data.message || 'Invalid credentials', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred during login');
        });
}

function loadRegisteredEmails() {
    fetch('/admin/emails')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('emailsTableBody');
            tableBody.innerHTML = '';

            data.emails.forEach(email => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <span class="email-text">${email}</span>
                        <input type="email" class="form-control neuromorphic-input d-none" value="${email}">
                    </td>
                    <td>
                        <button class="btn btn-sm" onclick="editEmail(this)">
                            <i class="bi bi-pencil-fill"></i>
                        </button>
                        <button class="btn btn-sm" onclick="deleteEmail('${email}')">
                            <i class="bi bi-trash-fill"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error loading emails:', error);
            showAlert('Error loading registered emails');
        });
}

function addNewEmail() {
    const emailInput = document.getElementById('newEmail');
    const email = emailInput.value.trim();

    if (!email) {
        showAlert('Please enter an email address', 'warning');
        return;
    }

    fetch('/admin/emails/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Email added successfully', 'success');
                emailInput.value = '';
                loadRegisteredEmails();
            } else {
                showAlert(data.message || 'Failed to add email', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while adding email');
        });
}

function editEmail(button) {
    const row = button.closest('tr');
    const emailText = row.querySelector('.email-text');
    const emailInput = row.querySelector('input[type="email"]');

    if (emailText.classList.contains('d-none')) {
        // Save changes
        const newEmail = emailInput.value.trim();
        const oldEmail = emailText.textContent;

        fetch('/admin/emails/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldEmail, newEmail })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    emailText.textContent = newEmail;
                    showAlert('Email updated successfully', 'success');
                } else {
                    emailInput.value = oldEmail;
                    showAlert(data.message || 'Failed to update email', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('An error occurred while updating email');
                emailInput.value = oldEmail;
            });

        emailText.classList.remove('d-none');
        emailInput.classList.add('d-none');
        button.innerHTML = '<i class="bi bi-pencil-fill"></i>';
    } else {
        // Show edit input
        emailText.classList.add('d-none');
        emailInput.classList.remove('d-none');
        button.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
}

function deleteEmail(email) {
    if (!confirm('Are you sure you want to delete this email?')) {
        return;
    }

    fetch('/admin/emails/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Email deleted successfully', 'success');
                loadRegisteredEmails();
            } else {
                showAlert(data.message || 'Failed to delete email', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while deleting email');
        });
}

function handleAdminUpdate(event) {
    event.preventDefault();

    const formData = new FormData();
    const newDeadline = document.getElementById('newDeadline').value;
    const newEmail = document.getElementById('newEmail').value;

    if (newDeadline) {
        formData.append('deadline', new Date(newDeadline).toLocaleString());
    }
    if (newEmail) {
        formData.append('new_email', newEmail);
    }

    fetch('/admin/update', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Updates successful', 'success');
                document.getElementById('adminUpdateForm').reset();
                initializeCountdown(); // Refresh countdown if deadline was updated
            } else {
                showAlert(data.message || 'Update failed', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred during update');
        });
}

function adminLogout() {
    window.location.href = '/admin/logout';
}