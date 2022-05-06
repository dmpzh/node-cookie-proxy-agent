import fs from 'fs';

/// OTHER
export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/// RANDOM
export const randomItem = <T>(array: T[]) => {
	if (array) {
		const randomIndex = Math.floor(Math.random() * array.length);
		return array[randomIndex];
	}
};

export const randomIntFromInterval = (min: number, max: number) => Math.floor(Math.random() * (max - min)) + min;

/// FS
export const fileReadAllLines = (path: string) => fs.readFileSync(path).toString().split(/\r?\n/);

/// ARRAY
export const shuffle = <T>(array: T[]) => {
	let currentIndex = array.length,
		temporaryValue,
		randomIndex;

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex -= 1;

		// And swap it with the current element.
		temporaryValue = array[currentIndex];
		array[currentIndex] = array[randomIndex];
		array[randomIndex] = temporaryValue;
	}

	return array;
};

export const haveSameContent = <T>(array1: T[], array2: T[]) => {
	if (array1.length !== array2.length) return false;
	for (let i = 0, sliced = array2.slice(); i < array1.length; i++) {
		const itemIndex = sliced.indexOf(array1[i]);
		if (itemIndex === -1) return false;
		sliced.splice(itemIndex, 1);
	}
	return true;
};

/// STRING
export const endIndexOf = (str: string, searchStr: string) => {
	const index = str.lastIndexOf(searchStr);
	return index == -1 ? -1 : index + searchStr.length;
};
