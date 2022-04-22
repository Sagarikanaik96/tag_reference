frappe.ui.form.on("Contact", {
	refresh: function(frm){
		lead_fields(frm);
		$('.form-footer').hide()
		$('[data-original-title="Menu"]').hide()
		$('[data-label="Invite%20as%20User"]').hide()
		$('[data-label="Links"]').hide()
		init_fields();
		make_field_mandatory();
		if(frm.doc.__islocal==1){
			cancel_cantact(frm);
		}

		$(document).on('click', '[data-fieldname="company"]', function(){
			companyhide(2000)
		});

		$('[data-fieldname="company"]').mouseover(function(){
			companyhide(300)
		})

	  	document.addEventListener("keydown", function(){
	  		companyhide(300)
	    })

		set_map(frm);
		hide_fields(frm);
		show_addr(frm)

	},
	onload: function (frm) {
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			cur_frm.fields_dict["company"].get_query = function () {
				return {
					query: "tag_workflow.tag_data.contact_company",
					filters: {
						company: frappe.defaults.get_user_default("Company"),
					},
				};
			};
		}
		if(frm.doc.__islocal==1){
			frm.set_df_property('lead','reqd',1);
		}
		frm.set_df_property('company','hidden',1);
		frm.set_df_property('mobile_no','hidden',1);
	},
	before_save:function(frm){
		if(!frm.doc.company){
			cur_frm.set_value('company',frappe.boot.tag.tag_user_info.company)
		}
		let name = frm.doc.first_name
		let company = frm.doc.company_name
		let email = frm.doc.email_address
		let zip = frm.doc.zip
		let phone = frm.doc.phone_number
		let is_valid = 1;
		if (name && name.length  > 120){
			frappe.msgprint({message: __('Name length exceeds'), indicator: 'red'})
			is_valid = 0
		}
		if (company && company.lenght > 120){
			frappe.msgprint({message: __('Company lenght exceeds'), indicator: 'red'})
			is_valid = 0
		}
		if (email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))){
			frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'})
			is_valid = 0
		}
		if (zip && (zip.length !=5 || isNaN(zip))){
			frappe.msgprint({message: __('Not Valid Zip'), indicator: 'red'})
			is_valid = 0
		}
		let regex = /[\d]/g;
		if (phone && (phone.length < 4 || phone.length > 15 || isNaN(phone)) && regex.test(phone) === true){
			frappe.msgprint({message: __('Phone Number should be between 4 to 15 characters and contain only digits.'), indicator: 'red'})
			is_valid = 0
		}
		if (is_valid == 0){
			frappe.validated = false
		}
	},
	validate: function(frm) {
		if (cur_frm.doc.is_primary == 1){
			frappe.call({
				"method": "tag_workflow.utils.whitelisted.validated_primarykey",
				"args": {"company": frm.doc.company},
				"async": 0,
				"callback": function(r){
					if (r.message.length > 0){
						frappe.msgprint({message: __('Is Primary already exist'), indicator: 'red'})
						frappe.validated = false;
					}
				}
			});
		}
	},
	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			tag_workflow.UpdateField(frm, "map");
			hide_fields(frm)
			show_addr(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			cur_frm.set_df_property('map','hidden',1)
		}
	},

	enter_manually: function(frm){
		if(cur_frm.doc.enter_manually == 1){
			tag_workflow.UpdateField(frm, "manually");
			show_fields(frm);
			show_addr(frm);
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			hide_fields(frm);
		}
	},
});


/*---------hide field------------*/
function init_fields(){
	var contact_field = ["middle_name","last_name","email_id","user","sync_with_google_contacts","status","salutation","designation","gender","image", "sb_00","sb_01","contact_details","more_info","company_name"];

	for(var field in contact_field){
		cur_frm.toggle_display(contact_field[field], 0);
	}
}

/*--------mandatory field------------*/
function make_field_mandatory(){
	let reqd = ["company", "phone_number", "email_address"];
	for(let r in reqd){
		cur_frm.toggle_reqd(reqd[r], 1);
	}
}

function cancel_cantact(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Contact");
	});
}


function companyhide(time) {
	setTimeout(() => {
		var txt  = $('[data-fieldname="company"]')[1].getAttribute('aria-owns')
		var txt2 = 'ul[id="'+txt+'"]'
		var  arry = document.querySelectorAll(txt2)[0].children
		document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none'
		document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none'

		
	}, time)
}

function lead_fields(frm){
	if(frm.doc.__islocal!=1){
		frm.set_df_property('lead','read_only',1);
	}
}

function hide_fields(frm){
	frm.set_df_property('city','hidden',frm.doc.city && frm.doc.enter_manually ==1?0:1);
	frm.set_df_property('state','hidden',frm.doc.state && frm.doc.enter_manually ==1?0:1);
	frm.set_df_property('zip','hidden',frm.doc.zip && frm.doc.enter_manually ==1?0:1);
}
function show_fields(frm){
	frm.set_df_property('city','hidden',0);
	frm.set_df_property('state','hidden',0);
	frm.set_df_property('zip','hidden',0);

}
function show_addr(frm){
	if(frm.doc.search_on_maps){
		frm.get_docfield('contact_address').label ='Complete Address';
	}else if(frm.doc.enter_manually){
		frm.get_docfield('contact_address').label ='Contact Address';
	}
	frm.refresh_field('contact_address');
}
const html=`<!doctype html>
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
          map = new google.maps.Map(document.getElementById("map"), {
            zoom: 8,
            center: default_location,
            mapTypeControl: false,
          });

          marker = new google.maps.Marker({map,});
          geocoder = new google.maps.Geocoder();

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
          update_address(data)
        }
        function update_address(data){
        	frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "contact_address", document.getElementById("autocomplete-address").value);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "state", data["administrative_area_level_1"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "city", data["locality"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "country_2", data["country"]);
					frappe.model.set_value(cur_frm.doc.doctype, cur_frm.doc.name, "zip", (data["postal_code"] ? data["postal_code"] : data["plus_code"]));
        }
      </script>
    </body>
  </html>
`;
function set_map (frm) {
  setTimeout(frm.set_df_property("map", "options", html), 500);
  if(frm.is_new()){
    frm.set_df_property('map','hidden',1);
    $('.frappe-control[data-fieldname="html"]').html('');
    $('.frappe-control[data-fieldname="map"]').html('');
  }else if(frm.doc.search_on_maps == 0 && frm.doc.enter_manually ==0){
    frm.set_df_property('map','hidden',1);
  }else if(frm.doc.enter_manually==1){
  	frm.set_df_property('map','hidden',1);
  }
}