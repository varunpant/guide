
import { rgb2lab, lab2rgb } from './lab.js';

class SuperPixel {
    constructor(label, L, A, B, X, Y) {
        this.label = label;
        this.L = L;
        this.A = A;
        this.B = B;
        this.X = X;
        this.Y = Y;
    }
}

export class SLIC {
    constructor(imageData, compactness, supsz) {
        this.imageData = imageData;
        this.width = imageData.width;
        this.height = imageData.height;
        this.compactness = compactness;
        const sz = this.width * this.height;
        this.step = Math.round(Math.sqrt(supsz));
        this.xStrips = Math.round(this.width / this.step);
        this.yStrips = Math.round(this.height / this.step);
        
        let x_err = this.width - this.step * this.xStrips;
        if (x_err < 0) {
            this.xStrips--;
            x_err = this.width - this.step * this.xStrips;
        }
        let y_err = this.height - this.step * this.yStrips;
        if (y_err < 0) {
            this.yStrips--;
            y_err = this.height - this.step * this.yStrips;
        }

        const x_err_per_strip = x_err / this.xStrips;
        const y_err_per_strip = y_err / this.yStrips;
        const x_offset = this.step / 2;
        const y_offset = this.step / 2;

        this.numSuperpixels = this.xStrips * this.yStrips;
        this.superpixels = new Array(this.numSuperpixels);
        this.labels = new Int32Array(sz).fill(-1);
        this.distvec = new Float64Array(sz);
        this.labData = this.convertRgbToLab();

        let label = 0;
        for (let y = 0; y < this.yStrips; y++) {
            const ye = y * y_err_per_strip;
            for (let x = 0; x < this.xStrips; x++) {
                const xe = x * x_err_per_strip;
                const seedx = Math.round(x * this.step + x_offset + xe);
                const seedy = Math.round(y * this.step + y_offset + ye);
                const c = this.getLab(seedx, seedy);
                this.superpixels[label] = new SuperPixel(label, c.L, c.A, c.B, seedx, seedy);
                label++;
            }
        }
    }

    convertRgbToLab() {
        const sz = this.width * this.height;
        const labData = new Float64Array(sz * 3);
        for (let i = 0; i < sz; i++) {
            const r = this.imageData.data[i * 4];
            const g = this.imageData.data[i * 4 + 1];
            const b = this.imageData.data[i * 4 + 2];
            const { L, A, B } = rgb2lab(r, g, b);
            labData[i * 3] = L;
            labData[i * 3 + 1] = A;
            labData[i * 3 + 2] = B;
        }
        return labData;
    }

    getLab(x, y) {
        const i = y * this.width + x;
        return {
            L: this.labData[i * 3],
            A: this.labData[i * 3 + 1],
            B: this.labData[i * 3 + 2],
        };
    }

    run(iterations) {
        if (iterations <= 0) {
            iterations = 1;
        }
        for (let i = 0; i < iterations; i++) {
            this.resetDistances();
            this.labelPixels();
            this.recalculateCentroids();
        }
        const {labelCount, newLabels} = this.enforceLabelConnectivity();
        this.labelCount = labelCount;
        this.labels = newLabels;
    }

    resetDistances() {
        this.distvec.fill(Infinity);
    }

    labelPixels() {
        for (const s of this.superpixels) {
            this.labelPixelsInSuperpixel(s);
        }
    }

    labelPixelsInSuperpixel(s) {
        const fstep = this.step;
        const invwt = 1.0 / ((fstep / this.compactness) * (fstep / this.compactness));

        const y1 = Math.max(0, Math.round(s.Y - fstep));
        const y2 = Math.min(this.height, Math.round(s.Y + fstep));
        const x1 = Math.max(0, Math.round(s.X - fstep));
        const x2 = Math.min(this.width, Math.round(s.X + fstep));

        const { L: supL, A: supA, B: supB } = s;
        const { X: supX, Y: supY } = s;

        for (let y = y1; y < y2; y++) {
            for (let x = x1; x < x2; x++) {
                const c = this.getLab(x, y);
                const X = x;
                const Y = y;
                const distc = (c.L - supL) * (c.L - supL) + (c.A - supA) * (c.A - supA) + (c.B - supB) * (c.B - supB);
                const distxy = (X - supX) * (X - supX) + (Y - supY) * (Y - supY);
                const dist = Math.sqrt(distc) + Math.sqrt(distxy * invwt);

                const i = y * this.width + x;
                if (dist < this.distvec[i]) {
                    this.distvec[i] = dist;
                    this.labels[i] = s.label;
                }
            }
        }
    }
    
    recalculateCentroids() {
        const supsz = this.superpixels.length;
        const sigma_l = new Float64Array(supsz);
        const sigma_a = new Float64Array(supsz);
        const sigma_b = new Float64Array(supsz);
        const sigma_x = new Float64Array(supsz);
        const sigma_y = new Float64Array(supsz);
        const clustersize = new Float64Array(supsz);

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = y * this.width + x;
                const label = this.labels[i];
                if (label === -1) {
                    continue;
                }
                const c = this.getLab(x, y);
                sigma_l[label] += c.L;
                sigma_a[label] += c.A;
                sigma_b[label] += c.B;
                sigma_x[label] += x;
                sigma_y[label] += y;
                clustersize[label] += 1.0;
            }
        }

        for (let n = 0; n < supsz; n++) {
            if (clustersize[n] <= 0) {
                clustersize[n] = 1.0;
            }
            const superpixel = this.superpixels[n];
            superpixel.L = sigma_l[n] / clustersize[n];
            superpixel.A = sigma_a[n] / clustersize[n];
            superpixel.B = sigma_b[n] / clustersize[n];
            superpixel.X = sigma_x[n] / clustersize[n];
            superpixel.Y = sigma_y[n] / clustersize[n];
        }
    }

    enforceLabelConnectivity() {
        const sz = this.width * this.height;
        const target_supsz = sz / (this.step * this.step);
        const SUPSZ = sz / target_supsz;

        const dx4 = [-1, 0, 1, 0];
        const dy4 = [0, -1, 0, 1];

        const xvec = new Int32Array(sz);
        const yvec = new Int32Array(sz);
        let oindex = 0;
        let adjlabel = 0;

        let label = 0;
        const nlabels = new Int32Array(sz).fill(-1);

        for (let j = 0; j < this.height; j++) {
            for (let k = 0; k < this.width; k++) {
                if (nlabels[oindex] < 0) {
                    nlabels[oindex] = label;
                    xvec[0] = k;
                    yvec[0] = j;

                    for (let n = 0; n < 4; n++) {
                        const x = xvec[0] + dx4[n];
                        const y = yvec[0] + dy4[n];
                        if ((x >= 0 && x < this.width) && (y >= 0 && y < this.height)) {
                            const nindex = y * this.width + x;
                            if (nlabels[nindex] >= 0) {
                                adjlabel = nlabels[nindex];
                            }
                        }
                    }

                    let count = 1;
                    for (let c = 0; c < count; c++) {
                        for (let n = 0; n < 4; n++) {
                            const x = xvec[c] + dx4[n];
                            const y = yvec[c] + dy4[n];

                            if ((x >= 0 && x < this.width) && (y >= 0 && y < this.height)) {
                                const nindex = y * this.width + x;
                                if (nlabels[nindex] < 0 && this.labels[oindex] === this.labels[nindex]) {
                                    xvec[count] = x;
                                    yvec[count] = y;
                                    nlabels[nindex] = label;
                                    count++;
                                }
                            }
                        }
                    }

                    if (count <= SUPSZ >> 2) {
                        for (let c = 0; c < count; c++) {
                            const ind = yvec[c] * this.width + xvec[c];
                            nlabels[ind] = adjlabel;
                        }
                        label--;
                    }
                    label++;
                }
                oindex++;
            }
        }
        return {labelCount: label, newLabels: nlabels};
    }

    drawEdges(imageData) {
        const dx8 = [-1, -1, 0, 1, 1, 1, 0, -1];
        const dy8 = [0, -1, -1, -1, 0, 1, 1, 1];
        const sz = this.width * this.height;
        const istaken = new Array(sz).fill(false);
        
        for (let j = 0; j < this.height; j++) {
            for (let k = 0; k < this.width; k++) {
                let np = 0;
                const mainindex = j * this.width + k;
                for (let i = 0; i < 8; i++) {
                    const x = k + dx8[i];
                    const y = j + dy8[i];

                    if ((x >= 0 && x < this.width) && (y >= 0 && y < this.height)) {
                        const index = y * this.width + x;
                        if (!istaken[index]) {
                            if (this.labels[mainindex] !== this.labels[index]) {
                                np++;
                            }
                        }
                    }
                }
                if (np > 1) {
                    imageData.data[mainindex * 4] = 0;
                    imageData.data[mainindex * 4 + 1] = 0;
                    imageData.data[mainindex * 4 + 2] = 0;
                    imageData.data[mainindex * 4 + 3] = 255;
                    istaken[mainindex] = true;
                }
            }
        }
        return imageData;
    }

    averageColors() {
        const lvec = new Float64Array(this.labelCount);
        const avec = new Float64Array(this.labelCount);
        const bvec = new Float64Array(this.labelCount);
        const count = new Int32Array(this.labelCount);
    
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = y * this.width + x;
                const label = this.labels[i];
                const c = this.getLab(x, y);
                lvec[label] += c.L;
                avec[label] += c.A;
                bvec[label] += c.B;
                count[label]++;
            }
        }
    
        for (let i = 0; i < this.labelCount; i++) {
            const c = count[i];
            lvec[i] /= c;
            avec[i] /= c;
            bvec[i] /= c;
        }
    
        return { lvec, avec, bvec };
    }

    colorWithAverageColors(imageData) {
        const { lvec, avec, bvec } = this.averageColors();
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = y * this.width + x;
                const label = this.labels[i];
                const { r, g, b } = lab2rgb(lvec[label], avec[label], bvec[label]);
                imageData.data[i * 4] = r;
                imageData.data[i * 4 + 1] = g;
                imageData.data[i * 4 + 2] = b;
                imageData.data[i * 4 + 3] = 255;
            }
        }
        return imageData;
    }
}