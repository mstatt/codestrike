document.addEventListener('DOMContentLoaded', function() {
    // Initialize the page
    updateHackathonDeadlines();
    initializeCountdown();

    // Form validation
    const projectSubmissionForm = document.getElementById('projectSubmissionForm');
    if (projectSubmissionForm) {
        projectSubmissionForm.addEventListener('submit', handleSubmission);
    }

    // Add admin-related event listeners
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }
});

function toggleCard(cardId) {
    // Hide all cards first
    const cards = document.querySelectorAll('.card');
    cards.forEach(card => {
        if (card.id !== cardId) {
            card.classList.add('d-none');
            card.classList.remove('show');
        }
    });

    // Toggle the selected card
    const selectedCard = document.getElementById(cardId);
    if (selectedCard) {
        if (selectedCard.classList.contains('d-none')) {
            selectedCard.classList.remove('d-none');
            // Use setTimeout to ensure the transition works
            setTimeout(() => {
                selectedCard.classList.add('show');
            }, 10);
        } else {
            selectedCard.classList.remove('show');
            setTimeout(() => {
                selectedCard.classList.add('d-none');
            }, 300); // Match the CSS transition duration
        }
    }
}

function updateHackathonDeadlines() {
    fetch('/hackathon-details')
        .then(response => response.json())
        .then(data => {
            if (data.deadline) {
                const deadline = new Date(data.deadline.replace(/,/, '')); 
                const formattedDeadline = deadline.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const deadlineDisplay = document.querySelector('.deadline-display');
                if (deadlineDisplay) {
                    deadlineDisplay.textContent = `Submission Deadline: ${formattedDeadline}`;
                }
            }
        })
        .catch(error => {
            console.error('Error loading hackathon details:', error);
            showAlert('Error loading hackathon details', 'danger');
        });
}

function initializeCountdown() {
    fetch('/get_deadline')
        .then(response => response.json())
        .then(data => {
            if (!data.deadline) {
                return;
            }

            const deadline = new Date(data.deadline);
            if (isNaN(deadline.getTime())) {
                return;
            }

            const deadlineTime = deadline.getTime();
            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = deadlineTime - now;

                if (distance < 0) {
                    clearInterval(timer);
                    return;
                }

                const days = Math.floor(distance / (1000 * 60 * 60 * 24));
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);

                const countdownElement = document.getElementById('countdown');
                if (countdownElement) {
                    countdownElement.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;
                }
            }, 1000);
        })
        .catch(error => {
            console.error('Error fetching deadline:', error);
        });
}

function showAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alertContainer');
    const alert = document.createElement('div');
    alert.className = `alert alert-${type} alert-dismissible fade show`;
    alert.role = 'alert';
    alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    alertContainer.appendChild(alert);

    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}

function handleSubmission(event) {
    event.preventDefault();
    const formData = new FormData();

    // Get form data
    const email = document.getElementById('email').value;
    const team_name = document.getElementById('team_name').value;
    const project_name = document.getElementById('project_name').value;
    const github = document.getElementById('github').value;
    const video = document.getElementById('video').value;
    const live_demo_url = document.getElementById('live_demo_url').value;

    formData.append('email', email);
    formData.append('team_name', team_name);
    formData.append('project_name', project_name);
    formData.append('github', github);
    formData.append('video', video);
    formData.append('live_demo_url', live_demo_url);

    fetch('/submit', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert(data.message, 'success');
            event.target.reset();
            toggleCard('submissionFormCard');
            loadSubmissions();
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
            if (!submissionsList) return;

            submissionsList.innerHTML = '';
            if (data.submissions) {
                data.submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                    .forEach(submission => {
                        const submissionDate = new Date(submission.submitted_at).toLocaleString();
                        const item = document.createElement('div');
                        item.className = 'list-group-item';
                        item.innerHTML = `
                            <div class="d-flex justify-content-between align-items-center">
                                <div>
                                    <h5 class="mb-2">${submission.team_name}</h5>
                                    <p class="mb-2"><strong>Project:</strong> ${submission.project_name}</p>
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
            }
        })
        .catch(error => {
            console.error('Error loading submissions:', error);
            showAlert('Error loading submissions');
        });
}

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
            showAlert('Successfully logged in', 'success');
            event.target.reset();
            toggleCard('adminCard');
        } else {
            showAlert(data.message || 'Invalid credentials', 'danger');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('An error occurred during login');
    });
}

function loadWinners() {
    fetch('/winners')
        .then(response => response.json())
        .then(data => {
            const winnersList = document.getElementById('winnersList');
            if (!winnersList) return;

            winnersList.innerHTML = '';
            if (data.winners && data.winners.length > 0) {
                data.winners.forEach((winner, index) => {
                    const item = document.createElement('div');
                    item.className = 'list-group-item';
                    item.innerHTML = `
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <span class="badge bg-primary">${index + 1}${getOrdinal(index + 1)} Place</span>
                                <h5 class="mt-2">${winner.team_name}</h5>
                                <p>${winner.project_name}</p>
                            </div>
                        </div>
                    `;
                    winnersList.appendChild(item);
                });
            } else {
                winnersList.innerHTML = '<div class="text-center">Winners have not been announced yet.</div>';
            }
        })
        .catch(error => {
            console.error('Error loading winners:', error);
            showAlert('Error loading winners');
        });
}

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
}