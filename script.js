// Inisialisasi peta
var map = L.map('map').setView([-7.250445, 112.768845], 13);
var baseMaps = {
  "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }),
  "Google Satellite": L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
    attribution: '&copy; Google Maps'
  })
};
baseMaps["Google Satellite"].addTo(map);
L.control.layers(baseMaps, null, { collapsed: false }).addTo(map);

var shapefileLayers = [];
var currentFeatures = [];
var qualityCounts = {
  good: 0,
  medium: 0,
  unknown: 0
};

// Fungsi untuk mengonversi nama atribut menjadi lebih mudah dibaca
function formatAttributeName(name) {
  if (!name) return '';
  
  // Menghapus underscore dan mengubah menjadi spasi
  let formatted = name.replace(/_/g, ' ');
  
  // Kapitalisasi tiap kata
  formatted = formatted.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
  
  return formatted;
}

// Fungsi untuk membuat popup content dengan ikon
function createPopupContent(properties) {
  return `
    <div class="popup-content">
      <h3 class="popup-header">
        <i class="fas fa-info-circle"></i> Informasi Tambak
      </h3>
      <table class="popup-table">
        ${Object.entries(properties)
          .filter(([k, v]) => k !== 'Shape_Leng' && k !== 'Shape_Area') // Filter out technical fields
          .map(([k, v]) =>
          `<tr>
            <td>${formatAttributeName(k)}</td>
            <td>${v}</td>
          </tr>`).join('')}
      </table>
    </div>`;
}

// Fungsi untuk menghitung jumlah kualitas air
function updateQualityCounts() {
  // Reset counts
  qualityCounts = {
    good: 0,
    medium: 0,
    unknown: 0
  };
  
  // Count features by status
  currentFeatures.forEach(feature => {
    const status = feature.properties?.Status;
    if (status === "Baik (Memenuhi)") qualityCounts.good++;
    else if (status === "Cemar Ringan") qualityCounts.medium++;
    else qualityCounts.unknown++;
  });
  
  // Update UI with animation
  const countElements = {
    good: document.getElementById('count-good'),
    medium: document.getElementById('count-medium'),
    unknown: document.getElementById('count-unknown')
  };
  
  Object.entries(countElements).forEach(([key, element]) => {
    const targetValue = qualityCounts[key];
    const currentValue = parseInt(element.textContent) || 0;
    
    // Animate counting
    if (currentValue !== targetValue) {
      const step = targetValue > currentValue ? 1 : -1;
      let currentCount = currentValue;
      
      const counterInterval = setInterval(() => {
        currentCount += step;
        element.textContent = currentCount;
        
        if ((step > 0 && currentCount >= targetValue) || 
            (step < 0 && currentCount <= targetValue)) {
          element.textContent = targetValue;
          clearInterval(counterInterval);
        }
      }, 50);
    }
  });
}

// Fungsi untuk memproses file GeoJSON dan menampilkannya di peta
function processGeoJSON(geojson, fileName) {
  // Simpan features untuk filter
  if (geojson.features) {
    currentFeatures = geojson.features;
  }
  
  var layer = L.geoJSON(geojson, {
    style: feature => {
      const status = feature.properties?.Status;
      let fillColor = '#9e9e9e';
      if (status === "Baik (Memenuhi)") fillColor = "#4caf50";
      else if (status === "Cemar Ringan") fillColor = "#ff9800";
      return {
        color: "#333",
        weight: 1.5,
        fillColor,
        fillOpacity: 0.7
      };
    },
    pointToLayer: (feature, latlng) => L.circleMarker(latlng, {
      radius: 8,
      fillColor: "#0288d1",
      color: '#000',
      weight: 1,
      opacity: 1,
      fillOpacity: 0.8
    })
  });

  layer.eachLayer(function(l) {
    if (l.feature.properties) {
      const popup = createPopupContent(l.feature.properties);
      
      l.bindPopup(popup, {
        autoPan: true,
        autoPanPaddingTopLeft: [50, 50],
        autoPanPaddingBottomRight: [50, 50],
        maxWidth: 300
      });
      
      l.on('click', function(e) {
        map.panTo(e.latlng, { animate: true, duration: 0.5 });
        
        l.openPopup();
        
        // Add pulse animation to selected feature
        if (l._path) {
          l._path.classList.add('marker-selected');
          setTimeout(() => {
            l._path.classList.remove('marker-selected');
          }, 3000);
        }
      });

      // Tambahkan animasi fade-in
      if (l._path) {
        l._path.style.opacity = '0';
        l._path.style.fillOpacity = '0';
        
        setTimeout(() => {
          l._path.style.transition = 'opacity 0.8s, fill-opacity 0.8s';
          l._path.style.opacity = '1';
          l._path.style.fillOpacity = '0.7';
        }, 200);
      }
    }
  });

  shapefileLayers.push(layer);
  layer.addTo(map);
  map.fitBounds(layer.getBounds());
  
  // Update kualitas air stats
  updateQualityCounts();
  
  // Sembunyikan overlay loading dengan animasi fade out
  const loadingElement = document.getElementById('loading');
  loadingElement.style.transition = 'opacity 0.8s ease';
  loadingElement.style.opacity = '0';
  setTimeout(() => {
    loadingElement.style.display = 'none';
  }, 800);
}

// Fungsi untuk memuat file shapefile dari folder
async function loadShapefilesFromFolder() {
  try {
    // URL file shapefile dalam folder Tambakk
    const folderPath = 'Tambakk';
    const shpFile = `${folderPath}/Tambakkkk.shp`;
    const dbfFile = `${folderPath}/Tambakkkk.dbf`;
    
    // Fetch file SHP dan DBF
    const fetchSHP = fetch(shpFile).then(res => {
      if (!res.ok) throw new Error(`SHP file error: ${res.statusText}`);
      return res.arrayBuffer();
    });
    
    const fetchDBF = fetch(dbfFile).then(res => {
      if (!res.ok) throw new Error(`DBF file error: ${res.statusText}`);
      return res.arrayBuffer();
    });
    
    // Opsional: coba fetch file SHX dan PRJ jika ada
    let fetchSHX = fetch(`${folderPath}/Tambakkkk.shx`)
      .then(res => res.ok ? res.arrayBuffer() : null)
      .catch(() => null);
      
    let fetchPRJ = fetch(`${folderPath}/Tambakkkk.prj`)
      .then(res => res.ok ? res.text() : null)
      .catch(() => null);
    
    // Tunggu semua fetch selesai
    const [shpData, dbfData, shxData, prjData] = await Promise.all([fetchSHP, fetchDBF, fetchSHX, fetchPRJ]);
    
    // Gunakan shpjs untuk parsing file shapefile
    // Langkah 1: Parse geometri dari SHP
    const geojson = await shp.parseShp(shpData, prjData);
    
    // Langkah 2: Parse atribut dari DBF dan gabungkan dengan geometri
    const dbfParsed = await shp.parseDbf(dbfData);
    
    // Langkah 3: Gabungkan geometri dan atribut
    const combinedData = shp.combine([geojson, dbfParsed]);
    
    // Proses dan tampilkan GeoJSON
    processGeoJSON(combinedData, "Tambakk (Auto)");
    
  } catch (error) {
    console.error("Error loading shapefile:", error);
    alert(`Gagal memuat file shapefile: ${error.message}`);
    document.getElementById('loading').style.display = 'none';
  }
}

// Load shapefile dari folder Tambakk saat halaman dimuat
document.addEventListener('DOMContentLoaded', function() {
  loadShapefilesFromFolder();
  
  // Update theme text based on current state
  updateThemeText();
});

// Event listener untuk filter status
document.getElementById('statusFilter').addEventListener('change', function () {
  const selected = this.value;
  
  // Reset currentFeatures to original features
  if (shapefileLayers.length > 0) {
    const allFeatures = [];
    shapefileLayers.forEach(layer => {
      layer.eachLayer(function (l) {
        if (l.feature) {
          allFeatures.push(l.feature);
        }
      });
    });
    currentFeatures = allFeatures;
  }
  
  // Filter features for display
  shapefileLayers.forEach(layer => {
    layer.eachLayer(function (l) {
      const status = l.feature?.properties?.Status;
      if (selected === 'all' || status === selected) {
        if (!map.hasLayer(l)) {
          l.addTo(map);
          
          // Add entrance animation for features being shown
          if (l._path) {
            l._path.style.opacity = '0';
            l._path.style.fillOpacity = '0';
            
            setTimeout(() => {
              l._path.style.transition = 'opacity 0.5s, fill-opacity 0.5s';
              l._path.style.opacity = '1';
              l._path.style.fillOpacity = '0.7';
            }, 10);
          }
        }
      } else {
        if (map.hasLayer(l)) {
          // Add exit animation for features being hidden
          if (l._path) {
            l._path.style.transition = 'opacity 0.3s, fill-opacity 0.3s';
            l._path.style.opacity = '0';
            l._path.style.fillOpacity = '0';
            
            setTimeout(() => {
              map.removeLayer(l);
            }, 300);
          } else {
            map.removeLayer(l);
          }
        }
      }
    });
  });
  
  // Filter also for counting
  if (selected !== 'all') {
    currentFeatures = currentFeatures.filter(f => f.properties.Status === selected);
  }
  
  updateQualityCounts();
});

// Handler untuk tombol pencarian
document.getElementById('searchButton').addEventListener('click', function() {
  searchLocation();
});

document.getElementById('searchBox').addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    searchLocation();
  }
});

function searchLocation() {
  const location = document.getElementById('searchBox').value.trim();
  if (!location) return;
  
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const latlng = [data[0].lat, data[0].lon];
        
        // Remove previous search marker if exists
        if (window.searchMarker) {
          map.removeLayer(window.searchMarker);
        }
        
        // Add marker with animation
        window.searchMarker = L.marker(latlng, {
          icon: L.divIcon({
            className: 'search-marker',
            html: `<div style="
              width: 24px;
              height: 24px;
              background-color: #0288d1;
              border: 3px solid white;
              border-radius: 50%;
              box-shadow: 0 0 0 2px rgba(0,0,0,0.2), 0 0 10px rgba(2, 136, 209, 0.6);
              animation: markerPulse 1.5s infinite;
            "></div>`,
            iconSize: [24, 24],
            iconAnchor: [12, 12]
          })
        }).addTo(map);
        
        map.flyTo(latlng, 15, {
          animate: true,
          duration: 1
        });
        
        // Add popup with location info
        const locationName = data[0].display_name;
        window.searchMarker.bindPopup(`
          <div class="popup-content">
            <h3 class="popup-header">
              <i class="fas fa-map-marker-alt"></i> Lokasi Pencarian
            </h3>
            <p style="margin: 5px 0;">${locationName}</p>
          </div>
        `).openPopup();
      } else {
        // Show error notification
        const notification = document.createElement('div');
        notification.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #f44336;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 9999;
            display: flex;
            align-items: center;
            gap: 10px;
          ">
            <i class="fas fa-exclamation-circle"></i>
            <span>Lokasi "${location}" tidak ditemukan</span>
          </div>
        `;
        document.body.appendChild(notification);
        
        setTimeout(() => {
          notification.style.transition = 'opacity 0.5s';
          notification.style.opacity = '0';
          setTimeout(() => {
            document.body.removeChild(notification);
          }, 500);
        }, 3000);
      }
    })
    .catch(error => {
      console.error("Error searching location:", error);
    });
}

// Toggle dark mode with text update
function updateThemeText() {
  const themeText = document.getElementById('theme-text');
  const isDark = document.body.classList.contains('dark');
  themeText.textContent = isDark ? 'Mode Terang' : 'Mode Gelap';
}

document.getElementById('darkToggle').addEventListener('change', function () {
  document.body.classList.toggle('dark', this.checked);
  updateThemeText();
});