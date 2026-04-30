async function test() {
  try {
    await fetch('http://localhost:8000/predict');
  } catch (e) {
    console.log("Caught error:", e.name, e.message);
  }
}
test();
