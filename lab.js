// Observer = 2°, Illuminant = D65
const RefX = 95.047;
const RefY = 100.000;
const RefZ = 108.883;

export function rgb2xyz(r, g, b) {
    let R = r / 255.0;
    let G = g / 255.0;
    let B = b / 255.0;

    if (R > 0.04045) {
        R = Math.pow(((R + 0.055) / 1.055), 2.4);
    } else {
        R = R / 12.92;
    }
    if (G > 0.04045) {
        G = Math.pow(((G + 0.055) / 1.055), 2.4);
    } else {
        G = G / 12.92;
    }
    if (B > 0.04045) {
        B = Math.pow(((B + 0.055) / 1.055), 2.4);
    } else {
        B = B / 12.92;
    }

    R *= 100;
    G *= 100;
    B *= 100;

    //Observer. = 2°, Illuminant = D65
    const X = R * 0.4124 + G * 0.3576 + B * 0.1805;
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
    const Z = R * 0.0193 + G * 0.1192 + B * 0.9505;

    return { X, Y, Z };
}

export function xyz2lab(x, y, z) {
    const epsilon = 0.008856;
    const kappa = 7.787;

    let X = x / RefX;
    let Y = y / RefY;
    let Z = z / RefZ;

    if (X > epsilon) {
        X = Math.pow(X, (1.0 / 3.0));
    } else {
        X = (kappa * X) + (16.0 / 116.0);
    }
    if (Y > epsilon) {
        Y = Math.pow(Y, (1.0 / 3.0));
    } else {
        Y = (kappa * Y) + (16.0 / 116.0);
    }
    if (Z > epsilon) {
        Z = Math.pow(Z, (1.0 / 3.0));
    } else {
        Z = (kappa * Z) + (16.0 / 116.0);
    }

    const L = ((116.0 * Y) - 16.0);
    const A = (500.0 * (X - Y));
    const B = (200.0 * (Y - Z));
    return { L, A, B };
}

export function rgb2lab(r, g, b) {
    const { X, Y, Z } = rgb2xyz(r, g, b);
    return xyz2lab(X, Y, Z);
}

export function lab2xyz(l, a, b) {
    let y = (l + 16.0) / 116.0;
    let x = a / 500.0 + y;
    let z = y - b / 200.0;

    const y_cube = Math.pow(y, 3);
    const x_cube = Math.pow(x, 3);
    const z_cube = Math.pow(z, 3);

    if (y_cube > 0.008856) {
        y = y_cube;
    } else {
        y = (y - 16.0 / 116.0) / 7.787;
    }
    if (x_cube > 0.008856) {
        x = x_cube;
    } else {
        x = (x - 16.0 / 116.0) / 7.787;
    }
    if (z_cube > 0.008856) {
        z = z_cube;
    } else {
        z = (z - 16.0 / 116.0) / 7.787;
    }

    x = RefX * x;
    y = RefY * y;
    z = RefZ * z;

    return { x, y, z };
}

export function xyz2rgb(x, y, z) {
    x /= 100.0;
    y /= 100.0;
    z /= 100.0;

    let R = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let G = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let B = x * 0.0557 + y * -0.2040 + z * 1.0570;

    if (R > 0.0031308) {
        R = 1.055 * Math.pow(R, (1 / 2.4)) - 0.055;
    } else {
        R = 12.92 * R;
    }
    if (G > 0.0031308) {
        G = 1.055 * Math.pow(G, (1 / 2.4)) - 0.055;
    } else {
        G = 12.92 * G;
    }
    if (B > 0.0031308) {
        B = 1.055 * Math.pow(B, (1 / 2.4)) - 0.055;
    } else {
        B = 12.92 * B;
    }

    const r = Math.max(0, Math.min(255, Math.round(R * 255)));
    const g = Math.max(0, Math.min(255, Math.round(G * 255)));
    const b = Math.max(0, Math.min(255, Math.round(B * 255)));

    return { r, g, b };
}

export function lab2rgb(l, a, b) {
    const { x, y, z } = lab2xyz(l, a, b);
    return xyz2rgb(x, y, z);
}
