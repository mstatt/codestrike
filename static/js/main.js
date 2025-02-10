function addNewTeam() {
    const teamNameInput = document.getElementById('newTeamName');
    const teamName = teamNameInput.value.trim();

    if (!teamName) {
        showAlert('Please enter a team name', 'warning');
        return;
    }

    fetch('/admin/teams/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ team_name: teamName })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Team added successfully', 'success');
                teamNameInput.value = '';
                loadTeams();
            } else {
                showAlert(data.message || 'Failed to add team', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while adding team');
        });
}

function checkDeadlineForMenuItems() {
    fetch('/get_deadline')
        .then(response => response.json())
        .then(data => {
            if (!data.deadline) {
                console.log('No deadline set');
                return;
            }

            const deadline = new Date(data.deadline);
            if (isNaN(deadline.getTime())) {
                console.log('Invalid deadline format');
                return;
            }

            const now = new Date();

            // Get menu items
            const winnersButton = document.querySelector('[data-bs-target="#winnersModal"]');

            if (winnersButton) {
                // Show winners only after deadline
                if (winnersButton.parentElement) {
                    winnersButton.parentElement.style.display = now > deadline ? 'block' : 'none';
                }
            }
        })
        .catch(error => {
            console.error('Error checking deadline:', error.message || 'Unknown error');
        });
}

function updateHackathonDeadlines() {
    fetch('/hackathon-details')
        .then(response => response.json())
        .then(data => {
            // Update form fields
            if (data.deadline) {
                const deadline = new Date(data.deadline.replace(/,/, '')); // Remove comma from date string
                const formattedDeadline = deadline.toISOString().slice(0, 16);
                document.getElementById('newDeadline').value = formattedDeadline;
            }
            if (data.title) {
                document.getElementById('hackathonTitle').value = data.title;
            }
            if (data.description) {
                document.getElementById('hackathonDescription').value = data.description;
            }
            if (data.rules && Array.isArray(data.rules)) {
                document.getElementById('hackathonRules').value = data.rules.join('\n');
            }
            if (data.prizes) {
                document.getElementById('firstPrize').value = data.prizes.first || '';
                document.getElementById('secondPrize').value = data.prizes.second || '';
                document.getElementById('thirdPrize').value = data.prizes.third || '';
            }
        })
        .catch(error => {
            console.error('Error loading hackathon details:', error);
            showAlert('Error loading hackathon details');
        });
}

function initializeCountdown() {
    fetch('/get_deadline')
        .then(response => response.json())
        .then(data => {
            if (!data.deadline) {
                document.getElementById('countdown').innerHTML = "No deadline set";
                return;
            }

            const deadline = new Date(data.deadline);
            if (isNaN(deadline.getTime())) {
                document.getElementById('countdown').innerHTML = "Invalid deadline";
                return;
            }

            const deadlineTime = deadline.getTime();

            // Format the deadline date for display
            const formattedDeadline = deadline.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const timer = setInterval(() => {
                const now = new Date().getTime();
                const distance = deadlineTime - now;

                if (distance < 0) {
                    clearInterval(timer);
                    document.getElementById('countdown').innerHTML = "Ended";
                    const submissionForm = document.getElementById('submissionForm');
                    if (submissionForm) {
                        submissionForm.classList.add('d-none');
                    }

                    // Show hackathon ended message
                    const endedMessage = document.getElementById('hackathonEndedMessage');
                    if (endedMessage) {
                        endedMessage.classList.remove('d-none');
                        const endDate = document.getElementById('endDate');
                        if (endDate) {
                            endDate.textContent = formattedDeadline;
                        }
                    }

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
            console.error('Error fetching deadline:', error.message || 'Unknown error');
            const countdownElement = document.getElementById('countdown');
            if (countdownElement) {
                countdownElement.innerHTML = "Error loading deadline";
            }
        });
}

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
    const themeToggleButton = document.querySelector('.dropdown-item i.bi[class*="bi-moon"], .dropdown-item i.bi[class*="bi-sun"]');
    if (themeToggleButton) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            themeToggleButton.classList.remove('bi-moon-fill');
            themeToggleButton.classList.add('bi-sun-fill');
        } else {
            themeToggleButton.classList.remove('bi-sun-fill');
            themeToggleButton.classList.add('bi-moon-fill');
        }
    }
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

    // Remove alert after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}


function handleSubmission(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('email', document.getElementById('email').value);
    formData.append('team_name', document.getElementById('team_name').value);
    formData.append('project_name', document.getElementById('project_name').value);
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
            submissionsList.innerHTML = '';

            data.submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                .forEach(submission => {
                    const submissionDate = new Date(submission.submitted_at).toLocaleString();
                    const item = document.createElement('div');
                    item.className = 'list-group-item neuromorphic mb-2';

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
                // Close login modal and open admin panel
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                loginModal.hide();

                const adminPanelModal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
                adminPanelModal.show();

                // Load registered emails, teams, and winners
                loadRegisteredEmails();
                loadTeams();
                loadAdminWinners();

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
    // First get the teams to populate dropdowns
    fetch('/admin/teams')
        .then(response => response.json())
        .then(teamsData => {
            if (!teamsData.success) {
                throw new Error('Failed to load teams');
            }

            // Now load emails
            return fetch('/admin/emails').then(response => response.json())
                .then(data => {
                    const tableBody = document.getElementById('emailsTableBody');
                    tableBody.innerHTML = '';

                    // Create team options HTML
                    const teamOptionsHtml = teamsData.teams.map(team =>
                        `<option value="${team}">${team}</option>`
                    ).join('');

                    data.emails.forEach(emailData => {
                        const email = typeof emailData === 'string' ? emailData : emailData.email;
                        const assignedTeam = typeof emailData === 'string' ? '' : emailData.team;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <span class="email-text">${email}</span>
                                <input type="email" class="form-control neuromorphic-input d-none" value="${email}">
                            </td>
                            <td>
                                <select class="form-select neuromorphic-input team-select" onchange="updateEmailTeam('${email}', this.value)">
                                    <option value="">Select Team</option>
                                    ${teamOptionsHtml}
                                </select>
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

                        // Set selected team if exists
                        if (assignedTeam) {
                            const select = row.querySelector('.team-select');
                            select.value = assignedTeam;
                        }
                    });
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

function updateEmailTeam(email, team) {
    fetch('/admin/emails/update-team', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, team })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Team assignment updated successfully', 'success');
            } else {
                showAlert(data.message || 'Failed to update team assignment', 'danger');
                loadRegisteredEmails(); // Reload to reset state
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while updating team assignment');
            loadRegisteredEmails(); // Reload to reset state
        });
}

function handleAdminUpdate(event) {
    event.preventDefault();

    const formData = new FormData();
    const newDeadline = document.getElementById('newDeadline').value;
    const hackathonTitle = document.getElementById('hackathonTitle').value;
    const hackathonDescription = document.getElementById('hackathonDescription').value;
    const hackathonRules = document.getElementById('hackathonRules').value;
    const firstPrize = document.getElementById('firstPrize').value;
    const secondPrize = document.getElementById('secondPrize').value;
    const thirdPrize = document.getElementById('thirdPrize').value;
    const hackathonLogo = document.getElementById('hackathonLogo').files[0];

    if (hackathonLogo) {
        formData.append('logo', hackathonLogo);
    }

    if (newDeadline) {
        formData.append('deadline', newDeadline);
    }

    if (hackathonTitle) {
        formData.append('title', hackathonTitle);
    }

    if (hackathonDescription) {
        formData.append('description', hackathonDescription);
    }

    if (hackathonRules) {
        formData.append('rules', hackathonRules);
    }

    if (firstPrize) {
        formData.append('first_prize', firstPrize);
    }

    if (secondPrize) {
        formData.append('second_prize', secondPrize);
    }

    if (thirdPrize) {
        formData.append('third_prize', thirdPrize);
    }

    fetch('/admin/update', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Hackathon details updated successfully', 'success');
                initializeCountdown(); // Refresh countdown
                updateHackathonDeadlines(); // Refresh deadlines
                checkDeadlineForMenuItems(); // Update menu items visibility

                // Update modal content if it exists
                const detailsModal = document.getElementById('hackathonDetailsModal');
                if (detailsModal) {
                    if (data.details) {
                        // Update image if provided
                        if (data.details.image) {
                            const modalImage = detailsModal.querySelector('.hackathon-image-container img');
                            if (modalImage) {
                                modalImage.src = `/static/images/${data.details.image}`;
                            }
                        }

                        // Update title if provided
                        if (data.details.title) {
                            detailsModal.querySelector('.modal-title').textContent = data.details.title;
                        }

                        // Update description if provided
                        if (data.details.description) {
                            detailsModal.querySelector('p').textContent = data.details.description;
                        }

                        // Update prizes if provided
                        if (data.details.prizes) {
                            const prizeDivs = detailsModal.querySelectorAll('.card-body p');
                            if (prizeDivs.length >= 3) {
                                prizeDivs[0].textContent = data.details.prizes.first || '$5,000';
                                prizeDivs[1].textContent = data.details.prizes.second || '$3,000';
                                prizeDivs[2].textContent = data.details.prizes.third || '$2,000';
                            }
                        }

                        // Update rules if provided
                        if (data.details.rules) {
                            const rulesList = detailsModal.querySelector('.list-group-flush');
                            if (rulesList) {
                                rulesList.innerHTML = data.details.rules
                                    .map(rule => `<li class="list-group-item">${rule}</li>`)
                                    .join('');
                            }
                        }
                    }
                }
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
    fetch('/admin/logout')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close admin panel modal
                const adminPanelModal = bootstrap.Modal.getInstance(document.getElementById('adminPanelModal'));
                if (adminPanelModal) {
                    adminPanelModal.hide();
                }

                // Re-enable page elements
                document.body.classList.remove('modal-open');
                const modalBackdrop = document.querySelector('.modal-backdrop');
                if (modalBackdrop) {
                    modalBackdrop.remove();
                }

                showAlert('Logged out successfully', 'success');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred during logout');
        });
}

function loadAdminWinners() {
    fetch('/admin/winners')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById('winnersTableBody');
                tableBody.innerHTML = '';

                data.winners.forEach(winner => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <span class="winner-text">${winner.team_name}</span>
                            <input type="text" class="form-control neuromorphic-input d-none" value="${winner.team_name}">
                        </td>
                        <td>
                            <span class="winner-text">${winner.project_name}</span>
                            <input type="text" class="form-control neuromorphic-input d-none" value="${winner.project_name}">
                        </td>
                        <td>
                            <span class="winner-text">${winner.points}</span>
                            <input type="number" class="form-control neuromorphic-input d-none" value="${winner.points}">
                        </td>
                        <td>
                            <button class="btn btn-sm" onclick="editWinner(this)">
                                <i class="bi bi-pencil-fill"></i>
                            </button>
                            <button class="btn btn-sm" onclick="deleteWinner('${winner.team_name}')">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                showAlert(data.message || 'Failed to load winners', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while loading winners');
        });
}

function handleAddWinner(event) {
    event.preventDefault();

    const teamName = document.getElementById('newTeamName').value;
    const projectName = document.getElementById('newProjectName').value;
    const points = document.getElementById('newPoints').value;

    fetch('/admin/winners/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            team_name: teamName,
            project_name: projectName,
            points: points
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Winner added successfully', 'success');
                document.getElementById('addWinnerForm').reset();
                loadAdminWinners();
            } else {
                showAlert(data.message || 'Failed to add winner', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while adding winner');
        });
}

function editWinner(button) {
    const row = button.closest('tr');
    const texts = row.querySelectorAll('.winner-text');
    const inputs = row.querySelectorAll('input');

    if (texts[0].classList.contains('d-none')) {
        // Save changes
        const teamName = inputs[0].value;
        const projectName = inputs[1].value;
        const points = inputs[2].value;
        const oldTeamName = texts[0].textContent;

        fetch('/admin/winners/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_team_name: oldTeamName,
                team_name: teamName,
                project_name: projectName,
                points: points
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    texts.forEach((text, index) => {
                        text.textContent = inputs[index].value;
                        text.classList.remove('d-none');
                    });
                    inputs.forEach(input => input.classList.add('d-none'));
                    button.innerHTML = '<i class="bi bi-pencil-fill"></i>';
                    showAlert('Winner updated successfully', 'success');
                } else {
                    showAlert(data.message || 'Failed to update winner', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('An error occurred while updating winner');
            });
    } else {
        // Show edit inputs
        texts.forEach(text => text.classList.add('d-none'));
        inputs.forEach(input => input.classList.remove('d-none'));
        button.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
}

function deleteWinner(teamName) {
    if (!confirm('Are you sure you want to delete this winner?')) {
        return;
    }

    fetch('/admin/winners/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ team_name: teamName })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Winner deleted successfully', 'success');
                loadAdminWinners();
            } else {
                showAlert(data.message || 'Failed to delete winner', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while deleting winner');
        });
}

function loadWinners() {
    fetch('/winners')
        .then(response => response.json())
        .then(data => {
            const winnersList = document.getElementById('winnersList');
            winnersList.innerHTML = '';

            data.winners.forEach((winner, index) => {
                const item = document.createElement('div');
                item.className = 'list-group-item neuromorphic mb-2';

                // Add trophy emoji for top 3
                let trophyIcon = '';
                if (index === 0) trophyIcon = '🏆 ';
                else if (index === 1) trophyIcon = '🥈 ';
                else if (index === 2) trophyIcon = '🥉 ';

                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">${trophyIcon}${winner.team_name}</h5>
                            <p class="mb-1">${winner.project_name}</p>
                            <p class="mb-1">Points: ${winner.points}</p>
                        </div>
                        <span class="badge bg-primary rounded-pill">#${index + 1}</span>
                    </div>
                `;
                winnersList.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading winners:', error);
            showAlert('Error loading winners');
        });
}

function loadTeams() {
    fetch('/admin/teams')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById('teamsTableBody');
                tableBody.innerHTML = '';

                data.teams.forEach(team => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <span class="team-text">${team}</span>
                            <input type="text" class="form-control neuromorphic-input d-none" value="${team}">
                        </td>
                        <td>
                            <button class="btn btn-sm" onclick="editTeam(this)">
                                <i class="bi bi-pencil-fill"></i>
                            </button>
                            <button class="btn btn-sm" onclick="deleteTeam('${team}')">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                showAlert(data.message || 'Failed to load teams', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while loading teams');
        });
}

function deleteTeam(teamName) {
    if (!confirm('Are you sure you want to delete this team?')) {
        return;
    }

    fetch('/admin/teams/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ team_name: teamName })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Team deleted successfully', 'success');
                loadTeams();
            } else {
                showAlert(data.message || 'Failed to delete team', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while deleting team');
        });
}

function editTeam(button) {
    const row = button.closest('tr');
    const teamText = row.querySelector('.team-text');
    const teamInput = row.querySelector('input[type="text"]');

    if (teamText.classList.contains('d-none')) {
        // Save changes
        const newTeamName = teamInput.value.trim();
        const oldTeamName = teamText.textContent;

        fetch('/admin/teams/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_team_name: oldTeamName,
                new_team_name: newTeamName
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    teamText.textContent = newTeamName;
                    showAlert('Team updated successfully', 'success');
                } else {
                    teamInput.value = oldTeamName;
                    showAlert(data.message || 'Failed to update team', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('An error occurred while updating team');
                teamInput.value = oldTeamName;
            });

        teamText.classList.remove('d-none');
        teamInput.classList.add('d-none');
        button.innerHTML = '<i class="bi bi-pencil-fill"></i>';
    } else {
        // Show edit input
        teamText.classList.add('d-none');
        teamInput.classList.remove('d-none');
        button.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Update hackathon details deadlines
    updateHackathonDeadlines();

    // Initialize countdown timer with current date
    initializeCountdown();

    // Check deadline for menu items visibility
    checkDeadlineForMenuItems();

    // Form validation
    const submissionForm = document.getElementById('projectSubmissionForm');
    if (submissionForm) {
        const inputs = submissionForm.querySelectorAll('input[required]');
        inputs.forEach(input => {
            input.addEventListener('input', validateInput);
            input.addEventListener('blur', validateInput);
        });
        submissionForm.addEventListener('submit', handleSubmission);
    }

    // Initialize theme
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeToggleIcon();

    // Load submissions if the element exists
    const submissionsList = document.getElementById('submissionsList');
    if (submissionsList) {
        loadSubmissions();
    }

    // Add admin-related event listeners
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }

    const adminUpdateForm = document.getElementById('adminUpdateForm');
    if (adminUpdateForm) {
        adminUpdateForm.addEventListener('submit', handleAdminUpdate);
    }

    // Add event listener for winners modal
    const winnersModal = document.getElementById('winnersModal');
    if (winnersModal) {
        winnersModal.addEventListener('show.bs.modal', loadWinners);
    }

    // Add event listener for admin panel modal
    const adminPanelModal = document.getElementById('adminPanelModal');
    if (adminPanelModal) {
        adminPanelModal.addEventListener('show.bs.modal', function () {
            // Load current hackathon details into form fields
            updateHackathonDeadlines();
            // Load other admin data
            loadRegisteredEmails();
            loadTeams();
            loadAdminWinners();
        });

        adminPanelModal.addEventListener('hidden.bs.modal', function () {
            // Re-enable page elements
            document.body.classList.remove('modal-open');
            const modalBackdrop = document.querySelector('.modal-backdrop');
            if (modalBackdrop) {
                modalBackdrop.remove();
            }
        });
    }

    // Add event listener for winners tab
    const winnersTab = document.getElementById('winners-tab');
    if (winnersTab) {
        winnersTab.addEventListener('shown.bs.tab', loadAdminWinners);
    }

    const addWinnerForm = document.getElementById('addWinnerForm');
    if (addWinnerForm) {
        addWinnerForm.addEventListener('submit', handleAddWinner);
    }
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
    const themeToggleButton = document.querySelector('.dropdown-item i.bi[class*="bi-moon"], .dropdown-item i.bi[class*="bi-sun"]');
    if (themeToggleButton) {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        if (currentTheme === 'dark') {
            themeToggleButton.classList.remove('bi-moon-fill');
            themeToggleButton.classList.add('bi-sun-fill');
        } else {
            themeToggleButton.classList.remove('bi-sun-fill');
            themeToggleButton.classList.add('bi-moon-fill');
        }
    }
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

    // Remove alert after 5 seconds
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 150);
    }, 5000);
}


function handleSubmission(event) {
    event.preventDefault();

    const formData = new FormData();
    formData.append('email', document.getElementById('email').value);
    formData.append('team_name', document.getElementById('team_name').value);
    formData.append('project_name', document.getElementById('project_name').value);
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
            submissionsList.innerHTML = '';

            data.submissions.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
                .forEach(submission => {
                    const submissionDate = new Date(submission.submitted_at).toLocaleString();
                    const item = document.createElement('div');
                    item.className = 'list-group-item neuromorphic mb-2';

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
                // Close login modal and open admin panel
                const loginModal = bootstrap.Modal.getInstance(document.getElementById('adminModal'));
                loginModal.hide();

                const adminPanelModal = new bootstrap.Modal(document.getElementById('adminPanelModal'));
                adminPanelModal.show();

                // Load registered emails, teams, and winners
                loadRegisteredEmails();
                loadTeams();
                loadAdminWinners();

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
    // First get the teams to populate dropdowns
    fetch('/admin/teams')
        .then(response => response.json())
        .then(teamsData => {
            if (!teamsData.success) {
                throw new Error('Failed to load teams');
            }

            // Now load emails
            return fetch('/admin/emails').then(response => response.json())
                .then(data => {
                    const tableBody = document.getElementById('emailsTableBody');
                    tableBody.innerHTML = '';

                    // Create team options HTML
                    const teamOptionsHtml = teamsData.teams.map(team =>
                        `<option value="${team}">${team}</option>`
                    ).join('');

                    data.emails.forEach(emailData => {
                        const email = typeof emailData === 'string' ? emailData : emailData.email;
                        const assignedTeam = typeof emailData === 'string' ? '' : emailData.team;

                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>
                                <span class="email-text">${email}</span>
                                <input type="email" class="form-control neuromorphic-input d-none" value="${email}">
                            </td>
                            <td>
                                <select class="form-select neuromorphic-input team-select" onchange="updateEmailTeam('${email}', this.value)">
                                    <option value="">Select Team</option>
                                    ${teamOptionsHtml}
                                </select>
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

                        // Set selected team if exists
                        if (assignedTeam) {
                            const select = row.querySelector('.team-select');
                            select.value = assignedTeam;
                        }
                    });
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

function updateEmailTeam(email, team) {
    fetch('/admin/emails/update-team', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, team })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Team assignment updated successfully', 'success');
            } else {
                showAlert(data.message || 'Failed to update team assignment', 'danger');
                loadRegisteredEmails(); // Reload to reset state
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while updating team assignment');
            loadRegisteredEmails(); // Reload to reset state
        });
}

function handleAdminUpdate(event) {
    event.preventDefault();

    const formData = new FormData();
    const newDeadline = document.getElementById('newDeadline').value;
    const hackathonTitle = document.getElementById('hackathonTitle').value;
    const hackathonDescription = document.getElementById('hackathonDescription').value;
    const hackathonRules = document.getElementById('hackathonRules').value;
    const firstPrize = document.getElementById('firstPrize').value;
    const secondPrize = document.getElementById('secondPrize').value;
    const thirdPrize = document.getElementById('thirdPrize').value;
    const hackathonLogo = document.getElementById('hackathonLogo').files[0];

    if (hackathonLogo) {
        formData.append('logo', hackathonLogo);
    }

    if (newDeadline) {
        formData.append('deadline', newDeadline);
    }

    if (hackathonTitle) {
        formData.append('title', hackathonTitle);
    }

    if (hackathonDescription) {
        formData.append('description', hackathonDescription);
    }

    if (hackathonRules) {
        formData.append('rules', hackathonRules);
    }

    if (firstPrize) {
        formData.append('first_prize', firstPrize);
    }

    if (secondPrize) {
        formData.append('second_prize', secondPrize);
    }

    if (thirdPrize) {
        formData.append('third_prize', thirdPrize);
    }

    fetch('/admin/update', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Hackathon details updated successfully', 'success');
                initializeCountdown(); // Refresh countdown
                updateHackathonDeadlines(); // Refresh deadlines
                checkDeadlineForMenuItems(); // Update menu items visibility

                // Update modal content if it exists
                const detailsModal = document.getElementById('hackathonDetailsModal');
                if (detailsModal) {
                    if (data.details) {
                        // Update image if provided
                        if (data.details.image) {
                            const modalImage = detailsModal.querySelector('.hackathon-image-container img');
                            if (modalImage) {
                                modalImage.src = `/static/images/${data.details.image}`;
                            }
                        }

                        // Update title if provided
                        if (data.details.title) {
                            detailsModal.querySelector('.modal-title').textContent = data.details.title;
                        }

                        // Update description if provided
                        if (data.details.description) {
                            detailsModal.querySelector('p').textContent = data.details.description;
                        }

                        // Update prizes if provided
                        if (data.details.prizes) {
                            const prizeDivs = detailsModal.querySelectorAll('.card-body p');
                            if (prizeDivs.length >= 3) {
                                prizeDivs[0].textContent = data.details.prizes.first || '$5,000';
                                prizeDivs[1].textContent = data.details.prizes.second || '$3,000';
                                prizeDivs[2].textContent = data.details.prizes.third || '$2,000';
                            }
                        }

                        // Update rules if provided
                        if (data.details.rules) {
                            const rulesList = detailsModal.querySelector('.list-group-flush');
                            if (rulesList) {
                                rulesList.innerHTML = data.details.rules
                                    .map(rule => `<li class="list-group-item">${rule}</li>`)
                                    .join('');
                            }
                        }
                    }
                }
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
    fetch('/admin/logout')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Close admin panel modal
                const adminPanelModal = bootstrap.Modal.getInstance(document.getElementById('adminPanelModal'));
                if (adminPanelModal) {
                    adminPanelModal.hide();
                }

                // Re-enable page elements
                document.body.classList.remove('modal-open');
                const modalBackdrop = document.querySelector('.modal-backdrop');
                if (modalBackdrop) {
                    modalBackdrop.remove();
                }

                showAlert('Logged out successfully', 'success');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred during logout');
        });
}

function loadAdminWinners() {
    fetch('/admin/winners')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById('winnersTableBody');
                tableBody.innerHTML = '';

                data.winners.forEach(winner => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <span class="winner-text">${winner.team_name}</span>
                            <input type="text" class="form-control neuromorphic-input d-none" value="${winner.team_name}">
                        </td>
                        <td>
                            <span class="winner-text">${winner.project_name}</span>
                            <input type="text" class="form-control neuromorphic-input d-none" value="${winner.project_name}">
                        </td>
                        <td>
                            <span class="winner-text">${winner.points}</span>
                            <input type="number" class="form-control neuromorphic-input d-none" value="${winner.points}">
                        </td>
                        <td>
                            <button class="btn btn-sm" onclick="editWinner(this)">
                                <i class="bi bi-pencil-fill"></i>
                            </button>
                            <button class="btn btn-sm" onclick="deleteWinner('${winner.team_name}')">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                showAlert(data.message || 'Failed to load winners', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while loading winners');
        });
}

function handleAddWinner(event) {
    event.preventDefault();

    const teamName = document.getElementById('newTeamName').value;
    const projectName = document.getElementById('newProjectName').value;
    const points = document.getElementById('newPoints').value;

    fetch('/admin/winners/add', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            team_name: teamName,
            project_name: projectName,
            points: points
        })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Winner added successfully', 'success');
                document.getElementById('addWinnerForm').reset();
                loadAdminWinners();
            } else {
                showAlert(data.message || 'Failed to add winner', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while adding winner');
        });
}

function editWinner(button) {
    const row = button.closest('tr');
    const texts = row.querySelectorAll('.winner-text');
    const inputs = row.querySelectorAll('input');

    if (texts[0].classList.contains('d-none')) {
        // Save changes
        const teamName = inputs[0].value;
        const projectName = inputs[1].value;
        const points = inputs[2].value;
        const oldTeamName = texts[0].textContent;

        fetch('/admin/winners/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_team_name: oldTeamName,
                team_name: teamName,
                project_name: projectName,
                points: points
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    texts.forEach((text, index) => {
                        text.textContent = inputs[index].value;
                        text.classList.remove('d-none');
                    });
                    inputs.forEach(input => input.classList.add('d-none'));
                    button.innerHTML = '<i class="bi bi-pencil-fill"></i>';
                    showAlert('Winner updated successfully', 'success');
                } else {
                    showAlert(data.message || 'Failed to update winner', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('An error occurred while updating winner');
            });
    } else {
        // Show edit inputs
        texts.forEach(text => text.classList.add('d-none'));
        inputs.forEach(input => input.classList.remove('d-none'));
        button.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
}

function deleteWinner(teamName) {
    if (!confirm('Are you sure you want to delete this winner?')) {
        return;
    }

    fetch('/admin/winners/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ team_name: teamName })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Winner deleted successfully', 'success');
                loadAdminWinners();
            } else {
                showAlert(data.message || 'Failed to delete winner', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while deleting winner');
        });
}

function loadWinners() {
    fetch('/winners')
        .then(response => response.json())
        .then(data => {
            const winnersList = document.getElementById('winnersList');
            winnersList.innerHTML = '';

            data.winners.forEach((winner, index) => {
                const item = document.createElement('div');
                item.className = 'list-group-item neuromorphic mb-2';

                // Add trophy emoji for top 3
                let trophyIcon = '';
                if (index === 0) trophyIcon = '🏆 ';
                else if (index === 1) trophyIcon = '🥈 ';
                else if (index === 2) trophyIcon = '🥉 ';

                item.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h5 class="mb-1">${trophyIcon}${winner.team_name}</h5>
                            <p class="mb-1">${winner.project_name}</p>
                            <p class="mb-1">Points: ${winner.points}</p>
                        </div>
                        <span class="badge bg-primary rounded-pill">#${index + 1}</span>
                    </div>
                `;
                winnersList.appendChild(item);
            });
        })
        .catch(error => {
            console.error('Error loading winners:', error);
            showAlert('Error loading winners');
        });
}

function loadTeams() {
    fetch('/admin/teams')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const tableBody = document.getElementById('teamsTableBody');
                tableBody.innerHTML = '';

                data.teams.forEach(team => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>
                            <span class="team-text">${team}</span>
                            <input type="text" class="form-control neuromorphic-input d-none" value="${team}">
                        </td>
                        <td>
                            <button class="btn btn-sm" onclick="editTeam(this)">
                                <i class="bi bi-pencil-fill"></i>
                            </button>
                            <button class="btn btn-sm" onclick="deleteTeam('${team}')">
                                <i class="bi bi-trash-fill"></i>
                            </button>
                        </td>
                    `;
                    tableBody.appendChild(row);
                });
            } else {
                showAlert(data.message || 'Failed to load teams', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while loading teams');
        });
}

function deleteTeam(teamName) {
    if (!confirm('Are you sure you want to delete this team?')) {
        return;
    }

    fetch('/admin/teams/delete', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ team_name: teamName })
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('Team deleted successfully', 'success');
                loadTeams();
            } else {
                showAlert(data.message || 'Failed to delete team', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('An error occurred while deleting team');
        });
}

function editTeam(button) {
    const row = button.closest('tr');
    const teamText = row.querySelector('.team-text');
    const teamInput = row.querySelector('input[type="text"]');

    if (teamText.classList.contains('d-none')) {
        // Save changes
        const newTeamName = teamInput.value.trim();
        const oldTeamName = teamText.textContent;

        fetch('/admin/teams/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                old_team_name: oldTeamName,
                new_team_name: newTeamName
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    teamText.textContent = newTeamName;
                    showAlert('Team updated successfully', 'success');
                } else {
                    teamInput.value = oldTeamName;
                    showAlert(data.message || 'Failed to update team', 'danger');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showAlert('An error occurred while updating team');
                teamInput.value = oldTeamName;
            });

        teamText.classList.remove('d-none');
        teamInput.classList.add('d-none');
        button.innerHTML = '<i class="bi bi-pencil-fill"></i>';
    } else {
        // Show edit input
        teamText.classList.add('d-none');
        teamInput.classList.remove('d-none');
        button.innerHTML = '<i class="bi bi-check-lg"></i>';
    }
}