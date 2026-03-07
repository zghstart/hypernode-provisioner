# Contributing to HyperNode-Provisioner

Thank you for your interest in contributing to HyperNode-Provisioner! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Commit Messages](#commit-messages)
- [Testing](#testing)

---

## 🛡️ Code of Conduct

### Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to make participation in our project and our community a harassment-free experience for everyone.

### Our Standards

Examples of behavior that contributes to a positive environment:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

---

## 🤔 How Can I Contribute?

### Reporting Bugs

Before creating a bug report:
1. **Check the documentation** - Your issue might already be covered
2. **Search existing issues** - Avoid duplicate reports
3. **Verify it's a bug** - Some issues may be configuration-related

**How to report a bug:**

```bash
# Use GitHub CLI to create an issue
gh issue create --title "[BUG] <short description>" --body "## Description\n\nDetailed description of the bug.\n\n## Environment\n- OS: \n- Java Version: \n- GPU Model: \n\n## Steps to Reproduce\n1. \n2. \n3.\n\n## Expected Behavior\n\n## Actual Behavior\n\n## Logs/Error Messages\n<paste logs here>" --label bug
```

### Suggesting Enhancements

Enhancement proposals should include:
1. Clear description of the proposed feature
2. Use cases and examples
3. Any potential impact on existing functionality

### Contributing Code

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Write/update tests
5. Submit a pull request

---

## 🛠️ Development Setup

### Prerequisites

- **Java 21** or later
- **Node.js 20** or later
- **Docker** and **Docker Compose**
- **Ansible** (for playbook development)

### Clone the Repository

```bash
git clone https://github.com/zghstart/hypernode-provisioner.git
cd hypernode-provisioner
```

### Backend Setup

```bash
cd backend

# Build the project
./gradlew build

# Run tests
./gradlew test

# Start the application (dev profile)
./gradlew bootRun
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Running with Docker

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

---

## 📝 Pull Request Process

### PR Template

When creating a pull request, use the following template:

```markdown
## Description
<!-- Brief description of changes -->

## Type of Change
<!-- Mark with an x -->
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Test update

## Checklist
<!-- Mark with an x -->
- [ ] My code follows the code style of this project
- [ ] I have updated the documentation accordingly
- [ ] I have added tests to cover my changes
- [ ] All new and existing tests passed
```

### PR Review Process

1. **Automated Checks**: Your PR will run through CI/CD pipeline
   - Build verification
   - Test coverage checks
   - Code quality analysis (SonarQube)

2. **Manual Review**: At least one maintainer will review your code
   - Code quality and style
   - Architecture decisions
   - Security considerations

3. **Merge Requirements**:
   - All automated checks must pass
   - At least one approval from maintainers
   - No unresolved comments

---

## 📚 Commit Messages

### Format

```
<type>: <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Test-related changes |
| `chore` | Maintenance tasks |

### Examples

```bash
# Good commit messages
git commit -m "feat: add support for H200 GPU provisioning"
git commit -m "fix: correct CUDA version pinning in playbook"
git commit -m "docs: update README with Docker setup instructions"
git commit -m "refactor: extract Ansible execution to separate service"
```

### Conventional Commits

This project follows [Conventional Commits](https://www.conventionalcommits.org/) specification. Automated tools use this format for:

- Change log generation
- Version bumping
- Release notes creation

---

## 🧪 Testing

### Backend Testing

```bash
# Run all tests
./gradlew test

# Run specific test class
./gradlew test --tests "com.hypernode.provisioner.service.*"

# Run with coverage
./gradlew jacocoTestReport
```

### Frontend Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:ui

# Run with coverage
npm run test -- --coverage
```

### Test Coverage Requirements

- **Backend**: Minimum 80% code coverage
- **Frontend**: Minimum 75% code coverage
- New features should include corresponding tests

---

## 🐳 Ansible Playbook Development

### Testing Playbooks

```bash
# Run playbook in check mode (dry run)
ansible-playbook playbooks/provision_gpu_node.yml --check

# Run with verbose output
ansible-playbook playbooks/provision_gpu_node.yml -v

# Run against specific host
ansible-playbook playbooks/provision_gpu_node.yml --limit "hostname"
```

### Best Practices

1. Always use `--check` mode for testing
2. Include `serial: 1` for rolling updates
3. Implement idempotency checks
4. Test rollback scenarios

---

## 📖 Documentation

### Documentation Guidelines

- All public APIs must have Javadoc/TypeDoc comments
- New features should include usage examples
- Architecture decisions should be documented in ADRs

### Generating API Documentation

```bash
# Backend API docs
./gradlew api-docs

# Frontend API docs
npm run docs:gen
```

---

## 🎯 Code Review Checklist

### For Reviewers

- [ ] Code follows project style guidelines
- [ ] Tests are included and passing
- [ ] Documentation is updated
- [ ] No security vulnerabilities introduced
- [ ] Performance implications considered
- [ ] Backward compatibility maintained

### For Authors

- [ ] Code is clean and readable
- [ ] Comments explain "why", not "what"
- [ ] Error handling is comprehensive
- [ ] Resource cleanup is implemented
- [ ] Logging is appropriate

---

## 🚀 Release Process

### Versioning

This project follows [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. Update version in `build.gradle` / `package.json`
2. Update `CHANGELOG.md`
3. Create release commit
4. Tag the release
5. Publish to package registries

---

## 📞 Getting Help

- **GitHub Issues**: Report bugs and feature requests
- **Discussions**: Join community discussions
- **Documentation**: Check the [Wiki](https://github.com/zghstart/hypernode-provisioner/wiki)

---

## 🙏 Thank You!

Thank you for contributing to HyperNode-Provisioner. Your efforts help make this project better for everyone in the community.
