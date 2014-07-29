//
//  QMAPoi.h
//  QMA-AR
//
//  Created by JB DeLima on 7/28/14.
//  Copyright (c) 2014 GuideOne. All rights reserved.
//

#import <Foundation/Foundation.h>
#import <CoreData/CoreData.h>

@class QMAGalleryItem, QMATarget;

@interface QMAPoi : NSManagedObject

@property (nonatomic, retain) NSString * aboutHTMLFile;
@property (nonatomic, retain) NSString * audio;
@property (nonatomic, retain) NSNumber * index;
@property (nonatomic, retain) NSString * factsHTMLFile;
@property (nonatomic, retain) NSString * image;
@property (nonatomic, retain) NSString * label;
@property (nonatomic, retain) NSString * personName;
@property (nonatomic, retain) NSString * borough;
@property (nonatomic, retain) NSSet *gallery;
@property (nonatomic, retain) QMATarget *target;
@end

@interface QMAPoi (CoreDataGeneratedAccessors)

- (void)addGalleryObject:(QMAGalleryItem *)value;
- (void)removeGalleryObject:(QMAGalleryItem *)value;
- (void)addGallery:(NSSet *)values;
- (void)removeGallery:(NSSet *)values;

@end
