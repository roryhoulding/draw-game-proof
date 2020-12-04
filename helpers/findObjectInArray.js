// Returns the index of an object in an array
// that matches a key value pair

module.exports = (key, value, arr) => {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === value) {
      // Objet found, return i as the array index
      return i;
    }
  }
  // Object not found
  return -1;
}