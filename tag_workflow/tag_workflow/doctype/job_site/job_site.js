// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Job Site', {
	refresh: function(frm){
		maps(frm);
	},

	setup: function(frm){
		frm.set_query('job_site_contact', function(doc) {
				return {
						query: "tag_workflow.tag_data.job_site_employee",
						filters: {
								'job_order_company': doc.company
						}
				}
		});
	},
	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			update_field(frm, "map");
		}
	},

	manually_enter: function(frm){
		if(cur_frm.doc.manually_enter == 1){
			update_field(frm, "manually");
		}
	}
});

/*----------fields-----------*/
function update_field(frm, field){
	if(field == "map"){
		frm.set_value("manually_enter", 0);
	}else{
		frm.set_value("search_on_maps", 0);
	}
}


/*----------maps------------*/
let html = `
	<!doctype html>
	<html>
		<head>
			<meta charset="utf-8">
		</head>
		<body>
			<input class="form-control" placeholder="Search a location" id="autocomplete-address" style="height: 30px;margin-bottom: 15px;">
			<div class="tab-content" title="map" style="text-align: center;padding: 4px;">
				<div id="map" style="height:450px;border-radius: var(--border-radius-md);"></div>
			</div>

			<script src="https://maps.googleapis.com/maps/api/js?key=${frappe.boot.tag.tag_user_info.api_key}&amp;libraries=places&amp;callback=initPlaces" async="" defer=""></script>
			<script>
				let autocomplete;
				let placeSearch;
				let place;
				let componentForm = {
					street_number: "long_name",
					route: "long_name",
					locality: "long_name",
					administrative_area_level_1: "long_name",
					country: "long_name",
					postal_code: "long_name"
				};

				window.initPlaces = function() {
					let default_location = { lat: 38.889248, lng: -77.050636 };
					if(cur_frm.doc.lat && cur_frm.doc.lng){
						default_location = { lat: Number(cur_frm.doc.lat), lng: Number(cur_frm.doc.lng) };
					}

					map = new google.maps.Map(document.getElementById("map"), {
						zoom: 8,
						center: default_location,
						mapTypeControl: false,
					});

					marker = new google.maps.Marker({map,});
					geocoder = new google.maps.Geocoder();
					geocode({ location: default_location });

					if(jQuery( "#autocomplete-address" ).length ){
						autocomplete = new google.maps.places.Autocomplete(
							document.getElementById( "autocomplete-address" ),
							{ types: [ "geocode" ] }
						);
						autocomplete.addListener( "place_changed", fillInAddress );
					}
				};

				function fillInAddress() {
					place = autocomplete.getPlace();
					if(!place.formatted_address && place.name){
						let val = parseFloat(place.name);
						if(!isNaN(val) && val <= 90 && val >= -90){
							 let latlng = place.name.split(",");
							 default_location = { lat: parseFloat(latlng[0]), lng: parseFloat(latlng[1]) };
							 geocode({ location: default_location });
						}
					}else{
						make_address(place, "auto");
						geocode({ address: place.formatted_address });
					}
				}

				function geolocate() {
					if(navigator.geolocation) {
						navigator.geolocation.getCurrentPosition( function( position ) {
							var geolocation = {
								lat: position.coords.latitude,
								lng: position.coords.longitude
							};
							var circle = new google.maps.Circle({
								center: geolocation,
								radius: position.coords.accuracy
							});
							autocomplete.setBounds( circle.getBounds() );
						});
					}
				}

				jQuery( "#autocomplete-address" ).on( "focus", function() {
					geolocate();
				});

				function geocode(request) {
					geocoder.geocode(request).then((result) => {
						const { results } = result;
						map.setCenter(results[0].geometry.location);
						marker.setPosition(results[0].geometry.location);
						marker.setMap(map);
						return results;
					}).catch((e) => {
						alert("Geocode was not successful for the following reason: " + e);
					});
				}

				function make_address(value, key){
					let data = {name:"",street_number:"",route:"",locality:"",administrative_area_level_1:"",country:"",postal_code:"",lat:"",lng:"",plus_code:""};
					if(key == "auto"){
						data["lat"] = value.geometry.location.lat();
						data["lng"] = value.geometry.location.lng();
						data["name"] = value.formatted_address;
						for(let i = 0; i < value.address_components.length; i++) {
							let addressType = value.address_components[i].types[0];
							if(componentForm[addressType]) {
								let val = value.address_components[i][componentForm[addressType]];
								let key = value.address_components[i].types[0];
								data[key] = val;
							}
						}
					}else{
						let values = value.results[0] || [];
						data["lat"] = (values ? values.geometry.location.lat() : "");
						data["lng"] = (values ? values.geometry.location.lng() : "");
						data["name"] = value.formatted_address;
						for(let i = 0; i < values.address_components.length; i++) {
							let addressType = values.address_components[i].types[0];
							if(componentForm[addressType]) {
								let val = values.address_components[i][componentForm[addressType]];
								let key = values.address_components[i].types[0];
								data[key] = val;
                                                        }
						}
					}
					update_address(data);
				}

				function update_address(data){
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "job_site", data["name"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "address", (data["street_number"]+" "+data["route"]));
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "lat", data["lat"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "lng", data["lng"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
				}
			</script>
		</body>
	</html>
`

function maps(frm){
	 setTimeout(cur_frm.set_df_property("html", "options", html), 500);
}
