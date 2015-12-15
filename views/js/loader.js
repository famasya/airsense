$(document).ready(function () {
	Highcharts.setOptions({
		global: {
			useUTC: false
		}
	});

	var tempseries, humidseries;
	$('#temp-realtime').highcharts({
		chart: {
			type: 'spline',
			animation: Highcharts.svg, 
			marginRight: 10,
			events: {
				load: function () {
					series = this.series;
				}
			}
		},
		title: {
			text: 'Live data'
		},
		xAxis: {
			type: 'datetime',
			tickPixelInterval: 150
		},
		yAxis: {
			title: {
				text: 'Value'
			},
			plotLines: [{
				value: 0,
				width: 1,
				color: '#808080'
			}]
		},
		tooltip: {
			formatter: function () {
				return '<b>' + this.series.name + '</b><br/>' +
				Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
				Highcharts.numberFormat(this.y, 2);
			}
		},
		legend: {
			enabled: false
		},
		exporting: {
			enabled: false
		},
		series: [
		{
			name: 'Temperature',
			data: (function () {
				var data = [],time = (new Date()).getTime(),i;
				for (i = -5; i <= 0; i += 1) {
					data.push({
						x: time + i * 1000,
						y: 0
					});
				}
				return data;
			}())
		},
		{
			name: 'Real temperature',
			data: (function () {
				var data = [],time = (new Date()).getTime(),i;
				for (i = -5; i <= 0; i += 1) {
					data.push({
						x: time + i * 1000,
						y: 0
					});
				}
				return data;
			}())
		}
		]
	});

	$('#humid-realtime').highcharts({
		chart: {
			type: 'spline',
			animation: Highcharts.svg, 
			marginRight: 10,
			events: {
				load: function () {
					series = this.series;
				}
			}
		},
		title: {
			text: 'Live data'
		},
		xAxis: {
			type: 'datetime',
			tickPixelInterval: 150
		},
		yAxis: {
			title: {
				text: 'Value'
			},
			plotLines: [{
				value: 0,
				width: 1,
				color: '#808080'
			}]
		},
		tooltip: {
			formatter: function () {
				return '<b>' + this.series.name + '</b><br/>' +
				Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x) + '<br/>' +
				Highcharts.numberFormat(this.y, 2);
			}
		},
		legend: {
			enabled: false
		},
		exporting: {
			enabled: false
		},
		series: [
		{
			name: 'Humidity',
			data: (function () {
				var data = [],time = (new Date()).getTime(),i;
				for (i = -5; i <= 0; i += 1) {
					data.push({
						x: time + i * 1000,
						y: 0
					});
				}
				return data;
			}())
		},
		{
			name: 'Real humidity',
			data: (function () {
				var data = [],time = (new Date()).getTime(),i;
				for (i = -5; i <= 0; i += 1) {
					data.push({
						x: time + i * 1000,
						y: 0
					});
				}
				return data;
			}())
		}
		]
	});

});
