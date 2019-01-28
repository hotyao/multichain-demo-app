var socket = io();
var timeAxis = new Array();
var valueAxis = new Array();
var lengthNum = 0;

$('html').addClass('sap-hud').addClass('visible');
$(document).on('ready', function () {   
    function parse(name) {
        var result = "", tmp = [];
        var items = location.search.substr(1).split("&");
        for (var index = 0; index < items.length; index++) {
            tmp = items[index].split("=");
            if (tmp[0] === name) {
                result = decodeURIComponent(tmp[1]);
                break;
            }
        }
        return result;
    }

    var ctx = document.getElementById("myChart").getContext('2d');
    var StartChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ["1/1/2018, 2:02:16 PM", "2/1/2018, 2:02:16 PM", "3/1/2018, 2:02:16 PM", "4/1/2018, 2:02:16 PM", "5/1/2018, 2:02:16 PM", "6/1/2018, 2:02:16 PM"],
            datasets: [{
                label: 'this is the sample chart, please click the read all button for real data',
                data: [2, 5, 12, 22, 25, 30],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.2)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)'
                ],
                borderWidth: 2
            }]
        },
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero:true
                    }
                }],
                xAxes: [{
                    type: 'time',
                    time: {
                        unit: 'day'
                    }
                }]
            }
        }
    });

    var odometer = parse("sap-odometer");
    if(odometer.length && $.isNumeric(odometer)){
        localStorage["sap-odometer"] = parseInt(odometer)+"";
        window.location = window.location.href.split("?")[0];     
    }    
    socket.on('message', function (message) {
        var obj = JSON.parse(message);   
        if (obj.action === 'finished') {  
            enableAllButtons(obj.origin, obj.successfull, obj.message, obj.asset_value);
        }
        else if (obj.action === 'read-finished') {
            lengthNum = obj.length;
            timeAxis = obj.asset_time;
            valueAxis = obj.asset_value;
            if (lengthNum >= 1)
               enableAllButtons(obj.origin, obj.successfull, obj.message, valueAxis[lengthNum-1]);
            else
               enableAllButtons(obj.origin, obj.successfull, obj.message, 0);

            $('#myChart').remove();
            $('#myChartParent').append('<canvas id="myChart" ></canvas>');
  
            var ctx1 = document.getElementById("myChart").getContext('2d');
            var myStartChart = new Chart(ctx1, {
                type: 'line',
                data: {
                    labels: timeAxis,
                    datasets: [{
                        label: 'Histroy Distance in Miles',
                        data: valueAxis,
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.2)'
                        ],
                        borderColor: [
                            'rgba(255,99,132,1)'
                        ],
                        borderWidth: 2
                    }]
                },
                options: {
                    scales: {
                        yAxes: [{
                            ticks: {
                                beginAtZero:true
                            }
                        }],
                        xAxes: [{
                            type: 'time',
                            time: {
                                unit: 'day'
                            }
                        }]
                    }
                }
            });
                  
         }
     });  

    
    if(sessionStorage["panelSelected"]){
        $(sessionStorage["panelSelected"]).addClass('selected');
    }
    $(".sidebar .panel .panel-content").addClass("transition");
    $(".sidebar .panel-header").click(function () {
        var $panel = $(this).parent();
        if($panel.hasClass('selected')) {
            $panel.removeClass('selected');
            delete sessionStorage["panelSelected"];
        }
        else{
            $(".sidebar .panel").removeClass('selected'); 
            $panel.addClass('selected');
            sessionStorage["panelSelected"] = '#' + $panel.attr('id');
        }
    }); 
    
	$('#nav-icon').click(function(){
		$("html").toggleClass('menu-open');
	});         

	$('#write-asset').click(function () {  
        var asset_id = $('input#write-asset-id').val();
        var asset_value = $('input#write-asset-value').val();  
        asset_value = asset_value.split(' ').join('').split('mi').join('').split('Miles').join('');
        if($.isNumeric(asset_value)) {
            asset_value = parseInt(asset_value);
            disableAllButtons('Write to the blockchain');
            socket.send(JSON.stringify({
                action: 'write',
                asset_id: asset_id,
                asset_value: asset_value
            }));
        }
        else {
            $('label#write-asset-value-label').addClass("panel-alert");
            $('select#write-asset-value').focus();
            $('#alert span').text('Please enter a numeric value');              
            $('#alert').fadeIn(300).delay(1000).fadeOut(300, function(){$('label#write-asset-value-label').removeClass("panel-alert");});
        }
		return false;
	});     

	$('#read-asset').click(function () {  
        var asset_id = $('input#read-asset-id').val();      
        disableAllButtons('Read from the blockchain');
        socket.send(JSON.stringify({
			action: 'read',
			asset_id: asset_id
		}));
		return false;
    });

    function enableAllButtons(action, successfull, message, value) {
        $('#alert').delay(300).fadeOut(300, function(){
            $('.panel button, .panel input[type="text"], .panel select, .panel label').removeAttr('disabled');
            if(action=="write"){
                if(successfull) {
                    $('#write-asset-value').addClass("accepted");
                    $('#accept').css("visibility","visible"); 
                    $("body, #write-asset").one("click", function() {
                        $('#write-asset-value').removeClass("accepted");
                        $('#accept').css("visibility","hidden");
                    });                          
                }
                else if(typeof message=="string" && message.indexOf("Warning: The blockchain is up-to-date")>=0) {
                    $('#write-asset-value').addClass("unchanged");
                    $('#unchange').css("visibility","visible"); 
                    $("body, #write-asset").one("click", function() {
                        $('#write-asset-value').removeClass("unchanged");
                        $('#unchange').css("visibility","hidden");
                    });                          
                }                        
                else {
                    $('#write-asset-value').addClass("rejected");
                    $('#reject').css("visibility","visible"); 
                    $("body, #write-asset").one("click", function() {
                        $('#write-asset-value').removeClass("rejected");
                        $('#reject').css("visibility","hidden");
                    });                          
                }
            }
            else if(action=="read" && successfull) {
                $('input#read-asset-value').val(parseInt(value) + " mi");                 
            }
        }); 
    }
    
    function disableAllButtons(text) {    
        $('#alert span').text(text);        
        $('#alert').fadeIn('slow');         
        $('.panel button, .panel input[type="text"], .panel select, .panel label').attr('disabled', 'disabled');
    } 
    


});


var app = angular.module("assets", ['ngRoute', 'ngAnimate']);

app.config(function ($routeProvider, $locationProvider) {
    $routeProvider
        .when('/', {
            templateUrl: 'assets.html',
            controller: 'ASSETS-CONTAINER'   
        })
		$locationProvider.hashPrefix('');
});

app.controller('ASSETS-CONTAINER', function ($scope, $route, $location) {
    angular.element(document).ready(function () {                             
        socket.on('message', function (message) {
            var obj = JSON.parse(message);  
            if (obj.action === 'finished-loading') {
                $('html').addClass('finished');
                var value = "0";
                if($.isNumeric(localStorage["sap-odometer"])){
                    value = parseInt(localStorage["sap-odometer"]);
                }
                value = value + " mi";
                $scope.asset_value = value;
                $scope.$apply();
                $('input#write-asset-value').val(value);
            }                        
        }); 
        socket.send(JSON.stringify({
            action: 'init',
			asset_id: 'SAP000S407W212743'
        }));               
    });   
});
