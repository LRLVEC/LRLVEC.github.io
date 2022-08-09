var g_LastTime = null;// 上次绘制的时间

function main()
{
	var gl = getGL();
	var vsFile = "res/shader/pointlight.vert.glsl";
	var fsFile = "res/shader/pointlight.frag.glsl";
	initShader(gl, vsFile, fsFile, function (sp)
	{
		var n = initVertexBuffers(gl, sp);

		// 设置入射光
		var u_LightColor = gl.getUniformLocation(sp, "u_LightColor");
		gl.uniform3f(u_LightColor, 1.0, 1.0, 1.0);
		var u_LightPosition = gl.getUniformLocation(sp, "u_LightPosition");
		gl.uniform3f(u_LightPosition, 2.3, 4.0, 3.5);

		// 设置环境光
		var u_LightColorAmbient = gl.getUniformLocation(sp, "u_LightColorAmbient");
		gl.uniform3f(u_LightColorAmbient, 0.2, 0.2, 0.2);

		// mvp矩阵
		var u_ModelMatrix = gl.getUniformLocation(sp, "u_ModelMatrix");
		var u_MvpMatrix = gl.getUniformLocation(sp, "u_MvpMatrix");

		// 逆转置矩阵
		var u_NormalMatrix = gl.getUniformLocation(sp, "u_NormalMatrix");


		var viewMat = lookAt(6, 6, 14, 0, 0, 0, 0, 1, 0);
		var projMat = getPerspectiveProjection(30, 16 / 9, 1, 100);

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.enable(gl.DEPTH_TEST);

		var speed = Math.PI / 4;// 角速度
		var rad = 0.0;// 启始角度
		var tick = function (timestamp)
		{
			var delta = g_LastTime ? (timestamp - g_LastTime) / 1000 : 0;// 上次绘制到本次绘制过去的时间(单位转换算成秒)
			g_LastTime = timestamp;// 保存本次时间
			rad = (rad + speed * delta) % (2 * Math.PI);// 当前的弧度
			draw(gl, n, rad, u_ModelMatrix, u_MvpMatrix, u_NormalMatrix, viewMat, projMat);
			requestAnimationFrame(tick);
		};
		requestAnimationFrame(tick);
	});
}

function getPerspectiveProjection(fov, aspect, near, far)
{
	var fovy = Math.PI * fov / 180 / 2;
	var s = Math.sin(fovy);
	var rd = 1 / (far - near);
	var ct = Math.cos(fovy) / s;

	return new Float32Array([
		ct / aspect, 0, 0, 0,
		0, ct, 0, 0,
		0, 0, -(far + near) * rd, -1,
		0, 0, -2 * near * far * rd, 0,
	]);
}

function lookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ)
{
	var zAxis = subVector([centerX, centerY, centerZ], [eyeX, eyeY, eyeZ]);
	var N = normalizeVector(zAxis);

	var xAxis = crossMultiVector(N, [upX, upY, upZ]);
	var U = normalizeVector(xAxis);

	var V = crossMultiVector(U, N);

	// 旋转的逆矩阵
	var r = new Float32Array([
		U[0], V[0], -N[0], 0,
		U[1], V[1], -N[1], 0,
		U[2], V[2], -N[2], 0,
		0, 0, 0, 1
	]);
	// 平移的逆矩阵
	var t = getTranslationMatrix(-eyeX, -eyeY, -eyeZ);

	return multiMatrix44(r, t);
}

function subVector(v1, v2)
{
	return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function normalizeVector(v)
{
	var len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
	return (len > 0.00001) ? [v[0] / len, v[1] / len, v[2] / len] : [0, 0, 0];
}

function crossMultiVector(v1, v2)
{
	return [
		v1[1] * v2[2] - v1[2] * v2[1],
		v1[2] * v2[0] - v1[0] * v2[2],
		v1[0] * v2[1] - v1[1] * v2[0]
	];
}

function getTranslationMatrix(x, y, z)
{
	return new Float32Array([
		1.0, 0.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0,
		0.0, 0.0, 1.0, 0.0,
		x, y, z, 1.0,
	]);
}

function multiMatrix44(m1, m2)
{
	var mat1 = transposeMatrix(m1);
	var mat2 = transposeMatrix(m2);

	var res = new Float32Array(16);
	for (var i = 0; i < 4; i++)
	{
		var row = [mat1[i * 4], mat1[i * 4 + 1], mat1[i * 4 + 2], mat1[i * 4 + 3]];
		for (var j = 0; j < 4; j++)
		{
			var col = [mat2[j], mat2[j + 4], mat2[j + 8], mat2[j + 12]];
			res[i * 4 + j] = dotMultiVector(row, col);
		}
	}
	return transposeMatrix(res);
}

function transposeMatrix(mat)
{
	var res = new Float32Array(16);
	for (var i = 0; i < 4; i++)
	{
		for (var j = 0; j < 4; j++)
		{
			res[i * 4 + j] = mat[j * 4 + i];
		}
	}
	return res;
}

function dotMultiVector(v1, v2)
{
	var res = 0;
	for (var i = 0; i < v1.length; i++)
	{
		res += v1[i] * v2[i];
	}
	return res;
}

function loadShaderFromFile(filename, onLoadShader)
{
	var request = new XMLHttpRequest();
	request.onreadystatechange = function ()
	{
		if (request.readyState === 4 && request.status === 200)
		{
			onLoadShader(request.responseText);
		}
	};
	request.open("GET", filename, true);
	request.send();
}

function initShader(gl, vsFile, fsFile, cb)
{
	var vs = null;
	var fs = null;

	var onShaderLoaded = function ()
	{
		if (vs && fs)
		{
			var sp = createProgram(gl, vs, fs);
			gl.useProgram(sp);
			cb(sp);
		}
	};

	loadShaderFromFile(vsFile, function (vsContent)
	{
		vs = vsContent;
		onShaderLoaded();
	});

	loadShaderFromFile(fsFile, function (fsContent)
	{
		fs = fsContent;
		onShaderLoaded();
	});
}

function getGL()
{
	var cavans = document.getElementById("container");
	return cavans.getContext("webgl") || cavans.getContext("experimental-webgl");
}

function createProgram(gl, srcVS, srcFS)
{
	var vs = loadShader(gl, gl.VERTEX_SHADER, srcVS);
	var fs = loadShader(gl, gl.FRAGMENT_SHADER, srcFS);

	var sp = gl.createProgram();
	gl.attachShader(sp, vs);
	gl.attachShader(sp, fs);

	// 1 对应vs和fs的vary变量 2 vs中varying变量必须赋值 3 共享vs和fs中相同的uniform变量 4 各种类型变量的数量检查
	gl.linkProgram(sp);
	if (!gl.getProgramParameter(sp, gl.LINK_STATUS))
	{
		console.log(gl.getProgramInfoLog(sp));
		return;
	}
	return sp;
}

function loadShader(gl, type, shaderSrc)
{
	var shader = gl.createShader(type);
	gl.shaderSource(shader, shaderSrc);
	gl.compileShader(shader);
	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS))
	{
		console.log(gl.getShaderInfoLog(shader));
		return;
	}
	return shader;
}

function getRotationMatrix(rad, x, y, z)
{
	if (x > 0)
	{
		// 绕x轴的旋转矩阵
		return new Float32Array([
			1.0, 0.0, 0.0, 0.0,
			0.0, Math.cos(rad), -Math.sin(rad), 0.0,
			0.0, Math.sin(rad), Math.cos(rad), 0.0,
			0.0, 0.0, 0.0, 1.0,
		]);
	} else if (y > 0)
	{
		// 绕y轴的旋转矩阵
		return new Float32Array([
			Math.cos(rad), 0.0, -Math.sin(rad), 0.0,
			0.0, 1.0, 0.0, 0.0,
			Math.sin(rad), 0.0, Math.cos(rad), 0.0,
			0.0, 0.0, 0.0, 1.0,
		]);
	} else if (z > 0)
	{
		// 绕z轴的旋转矩阵
		return new Float32Array([
			Math.cos(rad), Math.sin(rad), 0.0, 0.0,
			-Math.sin(rad), Math.cos(rad), 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0,
		]);
	} else
	{
		// 没有指定旋转轴，报个错，返回一个单位矩阵
		console.error("error: no axis");
		return new Float32Array([
			1.0, 0.0, 0.0, 0.0,
			0.0, 1.0, 0.0, 0.0,
			0.0, 0.0, 1.0, 0.0,
			0.0, 0.0, 0.0, 1.0,
		]);
	}
}

function initVertexBuffers(gl, sp)
{
	var vertices = new Float32Array([
		2.0, 2.0, 2.0, -2.0, 2.0, 2.0, -2.0, -2.0, 2.0, 2.0, -2.0, 2.0,
		2.0, 2.0, 2.0, 2.0, -2.0, 2.0, 2.0, -2.0, -2.0, 2.0, 2.0, -2.0,
		2.0, 2.0, 2.0, 2.0, 2.0, -2.0, -2.0, 2.0, -2.0, -2.0, 2.0, 2.0,
		-2.0, 2.0, 2.0, -2.0, 2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, 2.0,
		-2.0, -2.0, -2.0, 2.0, -2.0, -2.0, 2.0, -2.0, 2.0, -2.0, -2.0, 2.0,
		2.0, -2.0, -2.0, -2.0, -2.0, -2.0, -2.0, 2.0, -2.0, 2.0, 2.0, -2.0
	]);

	var colors = new Float32Array([
		1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
		1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
		1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
		1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
		1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
		1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0
	]);

	var normals = new Float32Array([
		0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,
		1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,
		0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,
		-1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,
		0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,
		0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0
	]);

	var indices = new Uint8Array([
		0, 1, 2, 0, 2, 3,
		4, 5, 6, 4, 6, 7,
		8, 9, 10, 8, 10, 11,
		12, 13, 14, 12, 14, 15,
		16, 17, 18, 16, 18, 19,
		20, 21, 22, 20, 22, 23
	]);

	initArrayBuffer(gl, sp, vertices, 3, gl.FLOAT, "a_Position");
	initArrayBuffer(gl, sp, normals, 3, gl.FLOAT, "a_Normal");
	initArrayBuffer(gl, sp, colors, 3, gl.FLOAT, "a_Color");

	var ibo = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

	return indices.length;
}

function initArrayBuffer(gl, sp, data, num, type, attribute)
{
	var buff = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, buff);
	gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);

	var attr = gl.getAttribLocation(sp, attribute);
	gl.vertexAttribPointer(attr, num, type, false, 0, 0);
	gl.enableVertexAttribArray(attr);

	gl.bindBuffer(gl.ARRAY_BUFFER, null);
}

function draw(gl, n, rad, u_ModelMatrix, u_MvpMatrix, u_NormalMatrix, viewMat, projMat)
{
	// 模型矩阵
	var modelMat = getRotationMatrix(rad, 0, 1, 0);
	gl.uniformMatrix4fv(u_ModelMatrix, false, modelMat);

	// 逆转置矩阵
	var inverseMat = inverseMatrix(modelMat);
	var inverseTranposeMat = transposeMatrix(inverseMat);
	gl.uniformMatrix4fv(u_NormalMatrix, false, inverseTranposeMat);

	// mvp矩阵
	var vpMat = multiMatrix44(projMat, viewMat);
	var mvpMat = multiMatrix44(vpMat, modelMat);
	gl.uniformMatrix4fv(u_MvpMatrix, false, mvpMat);

	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT, 0);
	gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
}


/**
 * 求矩阵的逆矩阵
 * */
function inverseMatrix(mat)
{
	var inv = new Float32Array(16);
	inv[0] = mat[5] * mat[10] * mat[15] - mat[5] * mat[11] * mat[14] - mat[9] * mat[6] * mat[15]
		+ mat[9] * mat[7] * mat[14] + mat[13] * mat[6] * mat[11] - mat[13] * mat[7] * mat[10];
	inv[4] = -mat[4] * mat[10] * mat[15] + mat[4] * mat[11] * mat[14] + mat[8] * mat[6] * mat[15]
		- mat[8] * mat[7] * mat[14] - mat[12] * mat[6] * mat[11] + mat[12] * mat[7] * mat[10];
	inv[8] = mat[4] * mat[9] * mat[15] - mat[4] * mat[11] * mat[13] - mat[8] * mat[5] * mat[15]
		+ mat[8] * mat[7] * mat[13] + mat[12] * mat[5] * mat[11] - mat[12] * mat[7] * mat[9];
	inv[12] = -mat[4] * mat[9] * mat[14] + mat[4] * mat[10] * mat[13] + mat[8] * mat[5] * mat[14]
		- mat[8] * mat[6] * mat[13] - mat[12] * mat[5] * mat[10] + mat[12] * mat[6] * mat[9];

	inv[1] = -mat[1] * mat[10] * mat[15] + mat[1] * mat[11] * mat[14] + mat[9] * mat[2] * mat[15]
		- mat[9] * mat[3] * mat[14] - mat[13] * mat[2] * mat[11] + mat[13] * mat[3] * mat[10];
	inv[5] = mat[0] * mat[10] * mat[15] - mat[0] * mat[11] * mat[14] - mat[8] * mat[2] * mat[15]
		+ mat[8] * mat[3] * mat[14] + mat[12] * mat[2] * mat[11] - mat[12] * mat[3] * mat[10];
	inv[9] = -mat[0] * mat[9] * mat[15] + mat[0] * mat[11] * mat[13] + mat[8] * mat[1] * mat[15]
		- mat[8] * mat[3] * mat[13] - mat[12] * mat[1] * mat[11] + mat[12] * mat[3] * mat[9];
	inv[13] = mat[0] * mat[9] * mat[14] - mat[0] * mat[10] * mat[13] - mat[8] * mat[1] * mat[14]
		+ mat[8] * mat[2] * mat[13] + mat[12] * mat[1] * mat[10] - mat[12] * mat[2] * mat[9];

	inv[2] = mat[1] * mat[6] * mat[15] - mat[1] * mat[7] * mat[14] - mat[5] * mat[2] * mat[15]
		+ mat[5] * mat[3] * mat[14] + mat[13] * mat[2] * mat[7] - mat[13] * mat[3] * mat[6];
	inv[6] = -mat[0] * mat[6] * mat[15] + mat[0] * mat[7] * mat[14] + mat[4] * mat[2] * mat[15]
		- mat[4] * mat[3] * mat[14] - mat[12] * mat[2] * mat[7] + mat[12] * mat[3] * mat[6];
	inv[10] = mat[0] * mat[5] * mat[15] - mat[0] * mat[7] * mat[13] - mat[4] * mat[1] * mat[15]
		+ mat[4] * mat[3] * mat[13] + mat[12] * mat[1] * mat[7] - mat[12] * mat[3] * mat[5];
	inv[14] = -mat[0] * mat[5] * mat[14] + mat[0] * mat[6] * mat[13] + mat[4] * mat[1] * mat[14]
		- mat[4] * mat[2] * mat[13] - mat[12] * mat[1] * mat[6] + mat[12] * mat[2] * mat[5];

	inv[3] = -mat[1] * mat[6] * mat[11] + mat[1] * mat[7] * mat[10] + mat[5] * mat[2] * mat[11]
		- mat[5] * mat[3] * mat[10] - mat[9] * mat[2] * mat[7] + mat[9] * mat[3] * mat[6];
	inv[7] = mat[0] * mat[6] * mat[11] - mat[0] * mat[7] * mat[10] - mat[4] * mat[2] * mat[11]
		+ mat[4] * mat[3] * mat[10] + mat[8] * mat[2] * mat[7] - mat[8] * mat[3] * mat[6];
	inv[11] = -mat[0] * mat[5] * mat[11] + mat[0] * mat[7] * mat[9] + mat[4] * mat[1] * mat[11]
		- mat[4] * mat[3] * mat[9] - mat[8] * mat[1] * mat[7] + mat[8] * mat[3] * mat[5];
	inv[15] = mat[0] * mat[5] * mat[10] - mat[0] * mat[6] * mat[9] - mat[4] * mat[1] * mat[10]
		+ mat[4] * mat[2] * mat[9] + mat[8] * mat[1] * mat[6] - mat[8] * mat[2] * mat[5];

	var det = mat[0] * inv[0] + mat[1] * inv[4] + mat[2] * inv[8] + mat[3] * inv[12];
	det = 1 / det;

	var d = new Float32Array(16);
	for (var i = 0; i < 16; i++)
	{
		d[i] = inv[i] * det;
	}
	return d;
}