# Contributing to Mnemorium

First off, thank you for considering contributing to Mnemorium! 🎉

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues. When you create a bug report, include as many details as possible:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce**
- **Provide specific examples**
- **Describe the behavior you observed**
- **Explain which behavior you expected**
- **Include screenshots/recordings if possible**
- **Include browser/OS information**

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion, include:

- **Use a clear and descriptive title**
- **Provide a detailed description of the feature**
- **Explain why this feature would be useful**
- **Include mockups or examples if possible**

### 🔀 Pull Requests

1. Fork the repo and create your branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure the test suite passes
4. Make sure your code follows the existing style
5. Write a clear commit message

### 📝 Code Style

- Use TypeScript
- Follow ESLint rules
- Use meaningful variable names
- Add comments for complex logic
- Keep functions small and focused

### 🧪 Testing

Before submitting:

```bash
# Run linter
npm run lint

# Build production
npm run build

# Test locally
npm run dev
```

### 📦 Commit Messages

Use clear and meaningful commit messages:

- `feat: add recall mode statistics`
- `fix: image loading in recall mode`
- `docs: update README with new features`
- `style: format code with prettier`
- `refactor: simplify annotation logic`
- `test: add unit tests for storage`

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/mnemorium-v2.git

# Install dependencies
npm install

# Create a branch
git checkout -b feature/my-feature

# Make changes and test
npm run dev

# Commit and push
git add .
git commit -m "feat: my awesome feature"
git push origin feature/my-feature
```

## Questions?

Feel free to open a discussion on GitHub!

## Code of Conduct

Be respectful and inclusive. We're all here to build something awesome together! 🚀