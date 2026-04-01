import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { API_BASE_URL } from '../../../api/axiosConfig'

const RESTAURANTS_CACHE_KEY = 'food_restaurants_cache'
const FOOD_CACHE_KEY = 'food_items_cache'
const TARGET_UPLOAD_BYTES = 900 * 1024
const MAX_IMAGE_SIDE = 1400

const normalizeRestaurant = (raw) => {
  if (!raw || typeof raw !== 'object') return null
  const source = raw.restaurant ?? raw.data ?? raw.result ?? raw
  if (!source || typeof source !== 'object') return null

  const id = source.id ?? source.restaurantId ?? null
  const name = source.name ?? source.restaurantName ?? ''
  const location = source.location ?? source.place ?? ''
  const imagePath = source.imagePath ?? source.imageUrl ?? source.image ?? ''

  if (id === null || id === undefined) return null
  return { id, name, location, imagePath }
}

const readCachedRestaurants = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RESTAURANTS_CACHE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeRestaurant).filter(Boolean)
  } catch {
    return []
  }
}

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = (error) => {
      URL.revokeObjectURL(objectUrl)
      reject(error)
    }
    image.src = objectUrl
  })

const canvasToBlob = (canvas, quality) =>
  new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })

const compressImageIfNeeded = async (file) => {
  if (!file || file.size <= TARGET_UPLOAD_BYTES) return file

  const image = await loadImageFromFile(file)
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.naturalWidth, image.naturalHeight))

  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return file
  context.drawImage(image, 0, 0, width, height)

  let quality = 0.85
  let blob = await canvasToBlob(canvas, quality)

  while (blob && blob.size > TARGET_UPLOAD_BYTES && quality > 0.45) {
    quality -= 0.1
    blob = await canvasToBlob(canvas, quality)
  }

  if (!blob) return file

  const safeName = file.name.replace(/\.[^.]+$/, '') || 'upload'
  return new File([blob], `${safeName}.jpg`, { type: 'image/jpeg' })
}

const saveFoodToCache = (foodItem, selectedRestaurantId) => {
  if (!foodItem || typeof foodItem !== 'object') return

  const source = foodItem.food ?? foodItem.data ?? foodItem.result ?? foodItem
  const fallbackId =
    source.id ??
    source.foodId ??
    `${source.name ?? source.foodName ?? 'item'}-${selectedRestaurantId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const normalized = {
    id: fallbackId,
    name: source.name ?? source.foodName ?? 'Unnamed Item',
    price: Number(source.price ?? source.cost ?? 0),
    imagePath: source.imagePath ?? source.imageUrl ?? source.image ?? '',
    restaurantId: Number(source.restaurantId ?? source.restaurant?.id ?? selectedRestaurantId),
    restaurantName: source.restaurant?.name ?? source.restaurantName ?? '',
  }

  const existingRaw = localStorage.getItem(FOOD_CACHE_KEY)
  const existing = (() => {
    try {
      const parsed = JSON.parse(existingRaw ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  const deduped = existing.filter(
    (item) => String(item.id) !== String(normalized.id) || String(item.restaurantId) !== String(normalized.restaurantId),
  )
  deduped.unshift(normalized)

  localStorage.setItem(FOOD_CACHE_KEY, JSON.stringify(deduped))
}

const readCachedFoodByRestaurant = (restaurantId) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(FOOD_CACHE_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter((item) => String(item.restaurantId ?? item.restaurant?.id ?? item.restaurantID ?? '') === String(restaurantId))
      .map((item, index) => ({
        id:
          item.id ??
          item.foodId ??
          `${item.name ?? item.foodName ?? 'item'}-${restaurantId}-${index}`,
        name: item.name ?? item.foodName ?? 'Unnamed Item',
        price: Number(item.price ?? item.cost ?? 0),
        imagePath: item.imagePath ?? item.imageUrl ?? item.image ?? '',
        restaurantId: Number(item.restaurantId ?? item.restaurant?.id ?? item.restaurantID ?? restaurantId),
        restaurantName: item.restaurantName ?? item.restaurant?.name ?? '',
      }))
  } catch {
    return []
  }
}

const upsertFoodInCache = (foodItem) => {
  if (!foodItem) return

  const existingRaw = localStorage.getItem(FOOD_CACHE_KEY)
  const existing = (() => {
    try {
      const parsed = JSON.parse(existingRaw ?? '[]')
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  })()

  const deduped = existing.filter(
    (item) => String(item.id) !== String(foodItem.id) || String(item.restaurantId) !== String(foodItem.restaurantId),
  )
  deduped.unshift(foodItem)
  localStorage.setItem(FOOD_CACHE_KEY, JSON.stringify(deduped))
}

const AddFoodItem = ({ refreshToken = 0 }) => {
  const [restaurants, setRestaurants] = useState([])
  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [restaurantId, setRestaurantId] = useState('')
  const [image, setImage] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loadingRestaurants, setLoadingRestaurants] = useState(false)
  const [manageRestaurantId, setManageRestaurantId] = useState('')
  const [restaurantFoods, setRestaurantFoods] = useState([])
  const [loadingFoods, setLoadingFoods] = useState(false)
  const [foodSearch, setFoodSearch] = useState('')
  const [editingFoodId, setEditingFoodId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editPrice, setEditPrice] = useState('')
  const [editImage, setEditImage] = useState(null)
  const [updatingFood, setUpdatingFood] = useState(false)
  const fileInputRef = useRef(null)
  const editFileInputRef = useRef(null)

  const fetchRestaurants = async () => {
      setLoadingRestaurants(true)
      try {
        const response = await axios.get(`${API_BASE_URL}/restaurants`)
        const list = Array.isArray(response.data) ? response.data.map(normalizeRestaurant).filter(Boolean) : []
        if (list.length > 0) {
          setRestaurants(list)
          localStorage.setItem(RESTAURANTS_CACHE_KEY, JSON.stringify(list))
          return
        }
      } catch {
        // Fallback below.
      }

      try {
        const response = await axios.get('/api/restaurants')
        const list = Array.isArray(response.data) ? response.data.map(normalizeRestaurant).filter(Boolean) : []
        if (list.length > 0) {
          setRestaurants(list)
          localStorage.setItem(RESTAURANTS_CACHE_KEY, JSON.stringify(list))
          return
        }
      } catch {
        // Fallback below.
      }

      setRestaurants(readCachedRestaurants())
    setLoadingRestaurants(false)
  }

  useEffect(() => {
    fetchRestaurants().finally(() => setLoadingRestaurants(false))
  }, [refreshToken])

  const fetchFoodsForRestaurant = async (selectedId) => {
    if (!selectedId) {
      setRestaurantFoods([])
      return
    }

    setLoadingFoods(true)
    try {
      const response = await axios.get(`${API_BASE_URL}/food?restaurantId=${selectedId}`)
      const list = Array.isArray(response.data) ? response.data : []
      const normalized = list.map((item, index) => ({
        id: item.id ?? item.foodId ?? `${item.name ?? item.foodName ?? 'item'}-${selectedId}-${index}`,
        name: item.name ?? item.foodName ?? 'Unnamed Item',
        price: Number(item.price ?? item.cost ?? 0),
        imagePath: item.imagePath ?? item.imageUrl ?? item.image ?? '',
        restaurantId: Number(item.restaurantId ?? item.restaurant?.id ?? selectedId),
      }))
      setRestaurantFoods(normalized)
      normalized.forEach((item) => upsertFoodInCache(item))
      return
    } catch {
      // fallback below
    }

    setRestaurantFoods(readCachedFoodByRestaurant(selectedId))
    setLoadingFoods(false)
  }

  useEffect(() => {
    fetchFoodsForRestaurant(manageRestaurantId).finally(() => setLoadingFoods(false))
  }, [manageRestaurantId])

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Enter food name')
      return
    }

    if (!price || Number(price) <= 0) {
      alert('Enter valid price')
      return
    }

    if (!restaurantId) {
      alert('Select restaurant')
      return
    }

    if (!image) {
      alert('Select food image')
      return
    }

    try {
      setSubmitting(true)
      const uploadFile = await compressImageIfNeeded(image)
      if (uploadFile.size > TARGET_UPLOAD_BYTES) {
        alert('Image is too large. Please choose a smaller image.')
        return
      }

      const formData = new FormData()
      formData.append('name', name)
      formData.append('price', price)
      formData.append('restaurantId', restaurantId)
      formData.append('image', uploadFile)

      const response = await axios.post(`${API_BASE_URL}/food/create`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      saveFoodToCache(response.data, restaurantId)
      alert('Food item added!')

      if (String(manageRestaurantId) === String(restaurantId)) {
        await fetchFoodsForRestaurant(restaurantId)
      }

      setName('')
      setPrice('')
      setRestaurantId('')
      setImage(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (error) {
      console.error(error)
      const backendMessage =
        (typeof error?.response?.data === 'string' && error.response.data) ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add food item'
      alert(backendMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (foodItem) => {
    setEditingFoodId(foodItem.id)
    setEditName(foodItem.name)
    setEditPrice(String(foodItem.price))
    setEditImage(null)
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  const filteredFoods = restaurantFoods.filter((item) =>
    item.name.toLowerCase().includes(foodSearch.trim().toLowerCase()),
  )

  const handleUpdateFood = async () => {
    if (!editingFoodId) return
    if (!editName.trim()) {
      alert('Enter food name')
      return
    }
    if (!editPrice || Number(editPrice) <= 0) {
      alert('Enter valid price')
      return
    }
    if (!manageRestaurantId) {
      alert('Select restaurant first')
      return
    }

    setUpdatingFood(true)
    try {
      let uploadFile = null
      if (editImage) {
        uploadFile = await compressImageIfNeeded(editImage)
        if (uploadFile.size > TARGET_UPLOAD_BYTES) {
          alert('Image is too large. Please choose a smaller image.')
          return
        }
      }

      const formData = new FormData()
      formData.append('name', editName)
      formData.append('price', editPrice)
      formData.append('restaurantId', manageRestaurantId)
      if (uploadFile) formData.append('image', uploadFile)

      const endpoints = [
        { method: 'put', url: `${API_BASE_URL}/food/update/${editingFoodId}` },
        { method: 'post', url: `${API_BASE_URL}/food/update/${editingFoodId}` },
        { method: 'put', url: `/api/food/update/${editingFoodId}` },
        { method: 'post', url: `/api/food/update/${editingFoodId}` },
      ]

      let updatedFromApi = null
      for (const endpoint of endpoints) {
        try {
          const response = await axios({
            method: endpoint.method,
            url: endpoint.url,
            data: formData,
            headers: { 'Content-Type': 'multipart/form-data' },
          })
          const source = response.data?.food ?? response.data?.data ?? response.data?.result ?? response.data
          updatedFromApi = {
            id: source?.id ?? source?.foodId ?? editingFoodId,
            name: source?.name ?? source?.foodName ?? editName,
            price: Number(source?.price ?? source?.cost ?? editPrice),
            imagePath: source?.imagePath ?? source?.imageUrl ?? source?.image ?? '',
            restaurantId: Number(source?.restaurantId ?? source?.restaurant?.id ?? manageRestaurantId),
          }
          break
        } catch {
          // Try next endpoint.
        }
      }

      const existing = restaurantFoods.find((item) => String(item.id) === String(editingFoodId))
      const fallbackUpdated = {
        id: editingFoodId,
        name: editName,
        price: Number(editPrice),
        imagePath: uploadFile ? URL.createObjectURL(uploadFile) : existing?.imagePath ?? '',
        restaurantId: Number(manageRestaurantId),
      }

      const finalUpdated = updatedFromApi ?? fallbackUpdated
      upsertFoodInCache(finalUpdated)
      setRestaurantFoods((prev) =>
        prev.map((item) => (String(item.id) === String(editingFoodId) ? { ...item, ...finalUpdated } : item)),
      )
      setEditingFoodId(null)
      setEditName('')
      setEditPrice('')
      setEditImage(null)
      if (editFileInputRef.current) editFileInputRef.current.value = ''

      if (updatedFromApi) {
        alert('Food item updated successfully')
      } else {
        alert('Food item updated locally. Backend update endpoint not available.')
      }
    } catch (error) {
      console.error(error)
      const backendMessage =
        (typeof error?.response?.data === 'string' && error.response.data) ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed to update food item'
      alert(backendMessage)
    } finally {
      setUpdatingFood(false)
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/60 p-5">
      <h3 className="text-xl font-bold text-slate-900">Add Food Item</h3>

      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-bold text-slate-900">Previously Added Restaurants</h4>
          <button
            type="button"
            onClick={() => fetchRestaurants().finally(() => setLoadingRestaurants(false))}
            className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
          >
            Refresh
          </button>
        </div>
        {restaurants.length === 0 ? (
          <p className="text-sm text-slate-500">No restaurants available yet.</p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <p className="font-semibold text-slate-900">{restaurant.name || `Restaurant #${restaurant.id}`}</p>
                <p className="text-xs text-slate-600">{restaurant.location || 'Location not set'}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <input
          type="text"
          placeholder="Food Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <input
          type="number"
          min="0"
          step="0.01"
          placeholder="Price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        />

        <select
          value={restaurantId}
          onChange={(e) => setRestaurantId(e.target.value)}
          className="rounded-xl border border-slate-300 px-3 py-2"
          disabled={loadingRestaurants}
        >
          <option value="">{loadingRestaurants ? 'Loading restaurants...' : 'Select Restaurant'}</option>
          {restaurants.map((restaurant) => (
            <option key={restaurant.id} value={restaurant.id}>
              {restaurant.name || `Restaurant #${restaurant.id}`}
            </option>
          ))}
        </select>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] ?? null)}
          className="rounded-xl border border-slate-300 px-3 py-2"
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white disabled:opacity-60"
      >
        {submitting ? 'Adding Food...' : 'Add Food Item'}
      </button>

      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h4 className="text-sm font-bold text-slate-900">Update Food Items by Restaurant</h4>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <select
            value={manageRestaurantId}
            onChange={(e) => setManageRestaurantId(e.target.value)}
            className="rounded-xl border border-slate-300 px-3 py-2"
          >
            <option value="">Select Restaurant to Manage</option>
            {restaurants.map((restaurant) => (
              <option key={restaurant.id} value={restaurant.id}>
                {restaurant.name || `Restaurant #${restaurant.id}`}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => fetchFoodsForRestaurant(manageRestaurantId).finally(() => setLoadingFoods(false))}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Load Food Items
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="text"
            value={foodSearch}
            onChange={(e) => setFoodSearch(e.target.value)}
            placeholder="Search food item by name"
            className="rounded-xl border border-slate-300 px-3 py-2"
          />
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
            Items: {filteredFoods.length}
          </div>
        </div>

        {loadingFoods ? (
          <p className="text-sm text-slate-500">Loading food items...</p>
        ) : filteredFoods.length === 0 ? (
          <p className="text-sm text-slate-500">No food items found for selected restaurant.</p>
        ) : (
          <div className="space-y-2">
            {filteredFoods.map((item, index) => (
              <div
                key={`${item.id}-${item.restaurantId}-${index}`}
                className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <img src={item.imagePath} alt={item.name} className="h-14 w-14 rounded-md object-cover" />
                  <div>
                    <p className="font-semibold text-slate-900">{item.name}</p>
                    <p className="text-sm text-slate-600">${Number(item.price).toFixed(2)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="rounded-lg bg-sky-600 px-3 py-2 text-xs font-semibold text-white"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}

        {editingFoodId && (
          <div className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 md:grid-cols-4">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Food Name"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={editPrice}
              onChange={(e) => setEditPrice(e.target.value)}
              placeholder="Price"
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <input
              ref={editFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => setEditImage(e.target.files?.[0] ?? null)}
              className="rounded-xl border border-slate-300 px-3 py-2"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleUpdateFood}
                disabled={updatingFood}
                className="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {updatingFood ? 'Updating...' : 'Update'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingFoodId(null)
                  setEditName('')
                  setEditPrice('')
                  setEditImage(null)
                  if (editFileInputRef.current) editFileInputRef.current.value = ''
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AddFoodItem
