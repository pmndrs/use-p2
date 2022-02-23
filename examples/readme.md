# @react-three/p2-examples

The examples rely on an alias pointing to `../dist/index`, the parent project must have been built previously.

To build the parent project:

```bash
cd ..
yarn
npm run build
cd examples
yarn
```

To start the dev server:

```bash
npm run dev
```

And visit http://localhost:3000 in your browser

## Common Bug Tracker

This is just a place to track issues we found while developing games

- [ ] Capsule triggers 3 impact events (might be p2-es problem)
- [ ] Animate a material causes TS error and fail
