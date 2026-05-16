import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, TextInput, FlatList, Image, 
    Pressable, ActivityIndicator, Dimensions, Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ImageSearchService, ImageSearchResult } from '../services/ImageSearchService';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* 
  CoverArtSearchScreen
  - Pinterest-style 2-column grid
  - Search Bar at top
  - Tap to select and close
*/

type Props = {
    visible: boolean;
    initialQuery: string;
    onClose: () => void;
    onSelect: (uri: string) => void;
};

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2; // 2 columns with padding

export const CoverArtSearchScreen: React.FC<Props> = ({ visible, initialQuery, onClose, onSelect }) => {
    const insets = useSafeAreaInsets();
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<ImageSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Search
    useEffect(() => {
        if (visible && initialQuery) {
            setQuery(initialQuery);
            handleSearch(initialQuery);
        }
    }, [visible, initialQuery]);

    const handleSearch = async (text: string) => {
        if (!text.trim()) return;
        setIsLoading(true);
        const images = await ImageSearchService.searchImages(text);
        setResults(images);
        setIsLoading(false);
    };

    const renderItem = ({ item }: { item: ImageSearchResult }) => (
        <Pressable 
            style={styles.gridItem} 
            onPress={() => onSelect(item.uri)}
        >
            <Image 
                source={{ uri: item.uri }} 
                style={styles.gridImage} 
                resizeMode="cover"
            />
            <View style={styles.itemMeta}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemArtist} numberOfLines={1}>{item.artist}</Text>
            </View>
        </Pressable>
    );

    return (
        <Modal 
            visible={visible} 
            animationType="slide" 
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <View style={[styles.container, { paddingTop: 20 }]}>
                {/* Header / Search Bar */}
                <View style={styles.header}>
                    <View style={styles.searchBar}>
                        <Ionicons name="search" size={20} color="#666" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.input}
                            value={query}
                            onChangeText={setQuery}
                            onSubmitEditing={() => handleSearch(query)}
                            placeholder="Search songs, albums..."
                            placeholderTextColor="#666"
                            returnKeyType="search"
                            autoFocus={false}
                        />
                        {query.length > 0 && (
                            <Pressable onPress={() => setQuery('')}>
                                <Ionicons name="close-circle" size={18} color="#666" />
                            </Pressable>
                        )}
                    </View>
                    <Pressable onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeText}>Cancel</Text>
                    </Pressable>
                </View>

                {/* Content */}
                {isLoading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#A78BFA" />
                        <Text style={styles.loadingText}>Searching iTunes...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={results}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        numColumns={2}
                        contentContainerStyle={styles.listContent}
                        columnWrapperStyle={styles.columnWrapper}
                        keyboardDismissMode="on-drag"
                        ListEmptyComponent={
                            <View style={styles.center}>
                                <Ionicons name="images-outline" size={48} color="#333" />
                                <Text style={styles.emptyText}>No results found</Text>
                            </View>
                        }
                    />
                )}
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#222',
        borderRadius: 10,
        paddingHorizontal: 12,
        height: 40,
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        height: '100%',
    },
    closeBtn: {
        paddingVertical: 8,
    },
    closeText: {
        color: '#A78BFA',
        fontSize: 16,
        fontWeight: '600',
    },
    listContent: {
        padding: 16,
    },
    columnWrapper: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    gridItem: {
        width: COLUMN_WIDTH,
        backgroundColor: '#222',
        borderRadius: 12,
        overflow: 'hidden',
    },
    gridImage: {
        width: '100%',
        height: COLUMN_WIDTH, // Square aspect ratio
        backgroundColor: '#333',
    },
    itemMeta: {
        padding: 8,
    },
    itemTitle: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 2,
    },
    itemArtist: {
        color: '#888',
        fontSize: 10,
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 50,
    },
    loadingText: {
        color: '#666',
        marginTop: 12,
    },
    emptyText: {
        color: '#666',
        marginTop: 12,
        fontSize: 16,
    }
});
